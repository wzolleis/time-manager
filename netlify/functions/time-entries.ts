// netlify/functions/time-entries.ts
import type {Config, Context} from "@netlify/functions";
import {z} from "zod";
import {hasDbCode} from "./lib/db-errors";
import {TimeEntryCreateSchema, TimeEntryUpdateSchema} from "../../shared/time-entry";
import {withTiming} from "./lib/timing";

import {IdSchema, isApiPath, notFound, pathParams} from "./lib/id";
import {ensureAccess, forbidden, ForbiddenError} from "./lib/roles";
import {type Session, withSession} from "./lib/session";
import {RuleError, ruleViolation} from "./lib/rule-error";
import {
    changeEntry,
    createEntry,
    deleteEntry,
    type Executor,
    getEntry,
    listEntries,
    NotFoundError,
} from "./lib/time-entries-store";

const ListQuerySchema = z.object({
    userId: z.string().uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

// Jeder User sieht und ändert nur seine eigenen Buchungen, ein Administrator die aller User
const handler = async (req: Request, _context: Context, session: Session) => {
    try {
        if (!isApiPath(req.url, "time-entries")) return notFound();
        const url = new URL(req.url);
        const rawId = pathParams(req.url, config.path).id;
        const authorize = (ownerId: string, ex?: Executor) => ensureAccess(session.user.id, ownerId, ex);

        // Sammlung: /api/time-entries
        if (rawId === undefined) {
            if (req.method === "GET") {
                const q = ListQuerySchema.parse(Object.fromEntries(url.searchParams));
                const userId = q.userId ?? session.user.id; // ohne Angabe die eigenen
                await authorize(userId);
                return Response.json(await listEntries(userId, q));
            }

            if (req.method === "POST") {
                const input = TimeEntryCreateSchema.parse(await readBody(req));
                await authorize(input.userId);
                return Response.json(await createEntry(input), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelne Buchung: /api/time-entries/:id
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            const entry = await getEntry(id);
            if (!entry) return notFound();
            await authorize(entry.userId);
            return Response.json(entry);
        }

        if (req.method === "PATCH") {
            const patch = TimeEntryUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }
            return Response.json(await changeEntry(id, patch, authorize));
        }

        if (req.method === "DELETE") {
            // ?pair=true löscht die Buchung zusammen mit ihrem Gegenstück
            await deleteEntry(id, url.searchParams.get("pair") === "true", authorize);
            return new Response(null, {status: 204});
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (err instanceof RuleError) return ruleViolation(err);
        if (err instanceof NotFoundError) return notFound();
        if (err instanceof ForbiddenError) return forbidden();
        if (hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "User oder Projekt existiert nicht"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("time-entries", withSession(handler));

export const config: Config = {path: ["/api/time-entries", "/api/time-entries/:id"]};
