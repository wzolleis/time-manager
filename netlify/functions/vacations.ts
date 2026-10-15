import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {and, asc, eq, isNull, or} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {holidays, users, vacations} from "../../db/schema";
import {checkRange, checkYearLimit, findOverlap, overlapMessage} from "../../shared/vacation-rules";
import {VacationCreateSchema, VacationUpdateSchema} from "../../shared/vacation";
import {IdSchema, isApiPath, notFound} from "./lib/id";
import {withSession} from "./lib/session";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

class RuleError extends Error {
}

class NotFoundError extends Error {
}

class UnknownUserError extends Error {
}

const ListQuerySchema = z.object({userId: z.string().uuid().optional()});

const getVacation = async (ex: Executor, id: string) => {
    const [row] = await ex.select().from(vacations).where(eq(vacations.id, id)).limit(1);
    return row ?? null;
};

// Sperrt die Zeile des Users bis zum Ende der Transaktion und prüft, dass er existiert
const lockUser = async (tx: Tx, userId: string) => {
    const rows = await tx
        .select({id: users.id})
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
    if (rows.length === 0) throw new UnknownUserError();
};

const userVacations = (tx: Tx, userId: string) =>
    tx.select().from(vacations).where(eq(vacations.userId, userId));

// Globale und eigene Feiertage: sie verbrauchen keinen Urlaubstag
const userHolidays = (tx: Tx, userId: string) =>
    tx
        .select({date: holidays.date})
        .from(holidays)
        .where(or(isNull(holidays.userId), eq(holidays.userId, userId)));

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const handler = async (req: Request, context: Context) => {
    try {
        if (!isApiPath(req.url, "vacations")) return notFound();
        const url = new URL(req.url);
        const rawId = context.params.id;

        // Sammlung: /api/vacations
        if (rawId === undefined) {
            if (req.method === "GET") {
                const q = ListQuerySchema.parse(Object.fromEntries(url.searchParams));
                const rows = await db
                    .select()
                    .from(vacations)
                    .where(and(q.userId ? eq(vacations.userId, q.userId) : undefined))
                    .orderBy(asc(vacations.startDate));
                return Response.json(rows);
            }

            if (req.method === "POST") {
                const input = VacationCreateSchema.parse(await readBody(req));
                const id = randomUUID();
                await db.transaction(async (tx) => {
                    await lockUser(tx, input.userId);
                    const existing = await userVacations(tx, input.userId);
                    const candidate = {id, startDate: input.startDate, endDate: input.endDate};
                    const clash = findOverlap(existing, candidate);
                    if (clash) throw new RuleError(overlapMessage(clash));
                    const overLimit = checkYearLimit(existing, candidate, await userHolidays(tx, input.userId));
                    if (overLimit) throw new RuleError(overLimit);
                    await tx.insert(vacations).values({id, ...input});
                });
                return Response.json(await getVacation(db, id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelner Urlaub: /api/vacations/:id
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            const row = await getVacation(db, id);
            return row ? Response.json(row) : notFound();
        }

        if (req.method === "PATCH") {
            const patch = VacationUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }

            await db.transaction(async (tx) => {
                const current = await getVacation(tx, id);
                if (!current) throw new NotFoundError();
                await lockUser(tx, current.userId);

                // Wurde nur ein Datum gesendet, gilt für das andere der gespeicherte Wert
                const next = {
                    id,
                    startDate: patch.startDate ?? current.startDate,
                    endDate: patch.endDate ?? current.endDate,
                };
                const problem = checkRange(next.startDate, next.endDate);
                if (problem) throw new RuleError(problem);

                const existing = await userVacations(tx, current.userId);
                const clash = findOverlap(existing, next);
                if (clash) throw new RuleError(overlapMessage(clash));
                const overLimit = checkYearLimit(existing, next, await userHolidays(tx, current.userId));
                if (overLimit) throw new RuleError(overLimit);

                await tx.update(vacations).set(patch).where(eq(vacations.id, id));
            });
            return Response.json(await getVacation(db, id));
        }

        if (req.method === "DELETE") {
            const [result] = await db.delete(vacations).where(eq(vacations.id, id));
            return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
        }

        return new Response(null, {status: 405});
    } catch (err) {
        console.log('---> Fehlerbehandlung in vacations', err);

        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (err instanceof RuleError) return Response.json({error: err.message}, {status: 422});
        if (err instanceof NotFoundError) return notFound();
        if (err instanceof UnknownUserError || hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "User existiert nicht"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("vacations", withSession(handler));

export const config: Config = {path: ["/api/vacations", "/api/vacations/:id"]};