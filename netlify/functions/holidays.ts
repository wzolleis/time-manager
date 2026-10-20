import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {asc, eq, isNull, or} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {holidays, users} from "../../db/schema";
import {findHolidayClash, holidayClashMessage, type HolidayRange} from "../../shared/holiday-rules";
import {HolidayCreateSchema, HolidayUpdateSchema} from "../../shared/holiday";
import {IdSchema, isApiPath, notFound, pathParams} from "./lib/id";
import {ensureAccess, forbidden, ForbiddenError, isAdmin} from "./lib/roles";
import {type Session, withSession} from "./lib/session";
import {RuleError, ruleViolation} from "./lib/rule-error";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

class NotFoundError extends Error {}

class UnknownUserError extends Error {}

// Ohne userId nur die globalen Feiertage, mit userId zusätzlich die eigenen dieses Users
const ListQuerySchema = z.object({userId: z.string().uuid().optional()});

const getHoliday = async (ex: Executor, id: string) => {
    const [row] = await ex.select().from(holidays).where(eq(holidays.id, id)).limit(1);
    return row ?? null;
};

// Sperrt die Zeile des Users bis zum Ende der Transaktion und prüft, dass er existiert
const lockUser = async (tx: Tx, userId: string) => {
    const rows = await tx.select({id: users.id}).from(users).where(eq(users.id, userId)).for("update");
    if (rows.length === 0) throw new UnknownUserError();
};

// FOR UPDATE sperrt auch die Lücke im Index auf date: ein paralleles Anlegen am selben Tag wartet
const holidaysOn = (tx: Tx, date: string) => tx.select().from(holidays).where(eq(holidays.date, date)).for("update");

const checkClash = async (tx: Tx, candidate: HolidayRange) => {
    const clash = findHolidayClash(await holidaysOn(tx, candidate.date), candidate);
    if (clash) throw new RuleError(holidayClashMessage(clash));
};

// Globale Feiertage (userId null) pflegt nur ein Administrator, eigene der User selbst
const authorize = async (session: Session, ownerId: string | null, ex: Executor = db) => {
    if (ownerId !== null) return ensureAccess(session.user.id, ownerId, ex);
    if (!(await isAdmin(session.user.id, ex))) throw new ForbiddenError();
};

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const handler = async (req: Request, _context: Context, session: Session) => {
    try {
        if (!isApiPath(req.url, "holidays")) return notFound();
        const url = new URL(req.url);
        const rawId = pathParams(req.url, config.path).id;

        // Sammlung: /api/holidays
        if (rawId === undefined) {
            if (req.method === "GET") {
                const q = ListQuerySchema.parse(Object.fromEntries(url.searchParams));
                if (q.userId) await ensureAccess(session.user.id, q.userId);
                const rows = await db
                    .select()
                    .from(holidays)
                    .where(
                        q.userId ? or(isNull(holidays.userId), eq(holidays.userId, q.userId)) : isNull(holidays.userId),
                    )
                    .orderBy(asc(holidays.date));
                return Response.json(rows);
            }

            if (req.method === "POST") {
                const input = HolidayCreateSchema.parse(await readBody(req));
                const id = randomUUID();
                await db.transaction(async (tx) => {
                    await authorize(session, input.userId, tx);
                    if (input.userId) await lockUser(tx, input.userId);
                    await checkClash(tx, {id, ...input});
                    await tx.insert(holidays).values({id, ...input});
                });
                return Response.json(await getHoliday(db, id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelner Feiertag: /api/holidays/:id
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            const row = await getHoliday(db, id);
            if (!row) return notFound();
            if (row.userId) await ensureAccess(session.user.id, row.userId); // globale darf jeder lesen
            return Response.json(row);
        }

        if (req.method === "PATCH") {
            const patch = HolidayUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }

            await db.transaction(async (tx) => {
                const current = await getHoliday(tx, id);
                if (!current) throw new NotFoundError();
                await authorize(session, current.userId, tx);
                if (current.userId) await lockUser(tx, current.userId);
                await checkClash(tx, {...current, ...patch});
                await tx.update(holidays).set(patch).where(eq(holidays.id, id));
            });
            return Response.json(await getHoliday(db, id));
        }

        if (req.method === "DELETE") {
            const row = await getHoliday(db, id);
            if (!row) return notFound();
            await authorize(session, row.userId);
            const [result] = await db.delete(holidays).where(eq(holidays.id, id));
            return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (err instanceof RuleError) return ruleViolation(err);
        if (err instanceof ForbiddenError) return forbidden();
        if (err instanceof NotFoundError) return notFound();
        if (err instanceof UnknownUserError || hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "User existiert nicht"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("holidays", withSession(handler));

export const config: Config = {path: ["/api/holidays", "/api/holidays/:id"]};
