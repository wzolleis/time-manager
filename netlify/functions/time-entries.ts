// netlify/functions/time-entries.ts
import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {and, asc, eq, gte, inArray, lt} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {hasDbCode} from "./lib/db-errors";
import {timeEntries, timeEntryProjects} from "../../db/schema";
import {TimeEntryCreateSchema, TimeEntryUpdateSchema} from "../../shared/time-entry";
import {type Booking, checkProject, checkSequence, findPartner} from "../../shared/time-rules";
import {withTiming} from "./lib/timing";

import {IdSchema, isApiPath, notFound, pathParams} from "./lib/id";
import {ensureAccess, forbidden, ForbiddenError} from "./lib/roles";
import {type Session, withSession} from "./lib/session";
import {RuleError, ruleViolation} from "./lib/rule-error";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

class NotFoundError extends Error {}

const ListQuerySchema = z.object({
    userId: z.string().uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});

const entryColumns = {
    id: timeEntries.id,
    userId: timeEntries.userId,
    type: timeEntries.type,
    bookedAt: timeEntries.bookedAt,
    projectId: timeEntryProjects.projectId, // null, wenn kein Projekt zugeordnet ist
};

const selectEntries = (ex: Executor) =>
    ex
        .select(entryColumns)
        .from(timeEntries)
        .leftJoin(timeEntryProjects, eq(timeEntryProjects.timeEntryId, timeEntries.id));

const getEntry = async (ex: Executor, id: string) => {
    const [row] = await selectEntries(ex).where(eq(timeEntries.id, id)).limit(1);
    return row ?? null;
};

// Alle Buchungen eines Users, für die Dauer der Transaktion gesperrt
const lockBookings = (tx: Tx, userId: string): Promise<Booking[]> =>
    tx
        .select({id: timeEntries.id, type: timeEntries.type, bookedAt: timeEntries.bookedAt})
        .from(timeEntries)
        .where(eq(timeEntries.userId, userId))
        .for("update");

const ensureValid = (bookings: Booking[]) => {
    const problem = checkSequence(bookings);
    if (problem) throw new RuleError(problem);
};

const ensureProject = (type: Booking["type"], projectId: string | null | undefined) => {
    const problem = checkProject(type, projectId);
    if (problem) throw new RuleError(problem);
};

const setProject = async (tx: Tx, entryId: string, projectId: string | null) => {
    await tx.delete(timeEntryProjects).where(eq(timeEntryProjects.timeEntryId, entryId));
    if (projectId) await tx.insert(timeEntryProjects).values({timeEntryId: entryId, projectId});
};

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

        // Sammlung: /api/time-entries
        if (rawId === undefined) {
            if (req.method === "GET") {
                const q = ListQuerySchema.parse(Object.fromEntries(url.searchParams));
                const userId = q.userId ?? session.user.id; // ohne Angabe die eigenen
                await ensureAccess(session.user.id, userId);
                const rows = await selectEntries(db)
                    .where(
                        and(
                            eq(timeEntries.userId, userId),
                            q.from ? gte(timeEntries.bookedAt, q.from) : undefined,
                            q.to ? lt(timeEntries.bookedAt, q.to) : undefined,
                        ),
                    )
                    .orderBy(asc(timeEntries.bookedAt));
                return Response.json(rows);
            }

            if (req.method === "POST") {
                const input = TimeEntryCreateSchema.parse(await readBody(req));
                await ensureAccess(session.user.id, input.userId);
                ensureProject(input.type, input.projectId);
                const id = randomUUID();
                await db.transaction(async (tx) => {
                    const existing = await lockBookings(tx, input.userId);
                    ensureValid([...existing, {id, type: input.type, bookedAt: input.bookedAt}]);
                    await tx.insert(timeEntries).values({
                        id,
                        userId: input.userId,
                        type: input.type,
                        bookedAt: input.bookedAt,
                    });
                    if (input.projectId) await setProject(tx, id, input.projectId);
                });
                return Response.json(await getEntry(db, id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelne Buchung: /api/time-entries/:id
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            const entry = await getEntry(db, id);
            if (!entry) return notFound();
            await ensureAccess(session.user.id, entry.userId);
            return Response.json(entry);
        }

        if (req.method === "PATCH") {
            const patch = TimeEntryUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }
            const {projectId, ...fields} = patch;

            await db.transaction(async (tx) => {
                const current = await getEntry(tx, id);
                if (!current) throw new NotFoundError();
                await ensureAccess(session.user.id, current.userId, tx);
                ensureProject(current.type, projectId);

                const existing = await lockBookings(tx, current.userId);
                const changed: Booking = {
                    id,
                    type: current.type,
                    bookedAt: fields.bookedAt ?? current.bookedAt,
                };
                ensureValid(existing.map((b) => (b.id === id ? changed : b)));

                if (Object.keys(fields).length > 0) {
                    await tx.update(timeEntries).set(fields).where(eq(timeEntries.id, id));
                }
                if (projectId !== undefined) await setProject(tx, id, projectId);
            });
            return Response.json(await getEntry(db, id));
        }

        if (req.method === "DELETE") {
            // ?pair=true löscht die Buchung zusammen mit ihrem Gegenstück
            const pair = url.searchParams.get("pair") === "true";

            await db.transaction(async (tx) => {
                const current = await getEntry(tx, id);
                if (!current) throw new NotFoundError();
                await ensureAccess(session.user.id, current.userId, tx);

                const existing = await lockBookings(tx, current.userId);
                const toDelete = new Set([id]);
                const partner = pair ? findPartner(existing, id) : null;
                if (partner) toDelete.add(partner.id);

                ensureValid(existing.filter((b) => !toDelete.has(b.id)));
                await tx.delete(timeEntries).where(inArray(timeEntries.id, [...toDelete]));
            });
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
