// netlify/functions/time-entries.ts
import type {Config, Context} from "@netlify/functions";
import {z} from "zod";
import {hasDbCode} from "./lib/db-errors";
import {TimeEntryCreateSchema, TimeEntryUpdateSchema} from "../../shared/time-entry";
import {withTiming} from "./lib/timing";

import {IdSchema, isRoutePath, notFound, pathParams} from "./lib/id";
import {ensureAccess, forbidden, ForbiddenError} from "./lib/roles";
import {type Session, withSession} from "./lib/session";
import {RuleError, ruleViolation} from "./lib/rule-error";
import {
    type Authorize,
    changeEntry,
    createEntry,
    deleteEntry,
    getEntry,
    listEntries,
    NotFoundError,
} from "./lib/time-entries-store";

const ListQuerySchema = z.object({
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
        if (!isRoutePath(req.url, config.path)) return notFound();
        const url = new URL(req.url);
        const params = pathParams(req.url, config.path);
        // Der Pfad sagt, wem die Buchungen gehören: der User selbst oder ein Administrator
        const userId = IdSchema.parse(params.userId);
        await ensureAccess(session.user.id, userId);
        // Eine Buchung eines anderen Users ist unter diesem Pfad "nicht gefunden", damit die API nicht
        // verrät, dass es sie gibt
        const authorize: Authorize = (ownerId) => {
            if (ownerId !== userId) throw new NotFoundError();
        };

        // Sammlung: /api/users/:userId/time-entries
        if (params.id === undefined) {
            if (req.method === "GET") {
                const q = ListQuerySchema.parse(Object.fromEntries(url.searchParams));
                return Response.json(await listEntries(userId, q));
            }

            if (req.method === "POST") {
                const input = TimeEntryCreateSchema.parse(await readBody(req));
                return Response.json(await createEntry(userId, input), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelne Buchung: /api/users/:userId/time-entries/:id
        const id = IdSchema.parse(params.id);

        if (req.method === "GET") {
            const entry = await getEntry(id);
            if (entry?.userId !== userId) return notFound();
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

export const config: Config = {path: ["/api/users/:userId/time-entries", "/api/users/:userId/time-entries/:id"]};
