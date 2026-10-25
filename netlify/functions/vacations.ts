import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {asc, eq, isNull, or} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {holidays, sickLeaves, users, vacations} from "../../db/schema";
import {checkRange, checkYearLimit, findOverlap, overlapMessage} from "../../shared/vacation-rules";
import {VacationCreateSchema, VacationUpdateSchema} from "../../shared/vacation";
import {IdSchema, isRoutePath, notFound, pathParams} from "./lib/id";
import {ensureAccess, forbidden, ForbiddenError} from "./lib/roles";
import {type Session, withSession} from "./lib/session";
import {RuleError, ruleViolation} from "./lib/rule-error";
import {loadSettingHistory} from "./lib/user-settings-store";
import {VACATION_DAYS_SETTING_ID} from "../../shared/user-setting";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

class NotFoundError extends Error {}

class UnknownUserError extends Error {}

const getVacation = async (ex: Executor, id: string) => {
    const [row] = await ex.select().from(vacations).where(eq(vacations.id, id)).limit(1);
    return row ?? null;
};

// Sperrt die Zeile des Users bis zum Ende der Transaktion und prüft, dass er existiert
const lockUser = async (tx: Tx, userId: string) => {
    const rows = await tx.select({id: users.id}).from(users).where(eq(users.id, userId)).for("update");
    if (rows.length === 0) throw new UnknownUserError();
};

const userVacations = (tx: Tx, userId: string) => tx.select().from(vacations).where(eq(vacations.userId, userId));

// Globale und eigene Feiertage: sie verbrauchen keinen Urlaubstag
const userHolidays = (tx: Tx, userId: string) =>
    tx
        .select({date: holidays.date})
        .from(holidays)
        .where(or(isNull(holidays.userId), eq(holidays.userId, userId)));

// Krankheitstage im Urlaub verbrauchen keinen Urlaubstag (§ 9 BUrlG)
const userSickLeaves = (tx: Tx, userId: string) =>
    tx
        .select({startDate: sickLeaves.startDate, endDate: sickLeaves.endDate})
        .from(sickLeaves)
        .where(eq(sickLeaves.userId, userId));

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const handler = async (req: Request, _context: Context, session: Session) => {
    try {
        if (!isRoutePath(req.url, config.path)) return notFound();
        const params = pathParams(req.url, config.path);
        // Der Pfad sagt, wem die Urlaube gehören: der User selbst oder ein Administrator
        const userId = IdSchema.parse(params.userId);
        await ensureAccess(session.user.id, userId);

        // Sammlung: /api/users/:userId/vacations
        if (params.id === undefined) {
            if (req.method === "GET") {
                const rows = await db
                    .select()
                    .from(vacations)
                    .where(eq(vacations.userId, userId))
                    .orderBy(asc(vacations.startDate));
                return Response.json(rows);
            }

            if (req.method === "POST") {
                const input = VacationCreateSchema.parse(await readBody(req));
                const id = randomUUID();
                await db.transaction(async (tx) => {
                    await lockUser(tx, userId);
                    const existing = await userVacations(tx, userId);
                    const candidate = {id, startDate: input.startDate, endDate: input.endDate};
                    const clash = findOverlap(existing, candidate);
                    if (clash) throw new RuleError(overlapMessage(clash));
                    const overLimit = checkYearLimit(
                        existing,
                        candidate,
                        await userHolidays(tx, userId),
                        await userSickLeaves(tx, userId),
                        await loadSettingHistory(userId, VACATION_DAYS_SETTING_ID, tx),
                    );
                    if (overLimit) throw new RuleError(overLimit);
                    await tx.insert(vacations).values({id, userId, ...input});
                });
                return Response.json(await getVacation(db, id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelner Urlaub: /api/users/:userId/vacations/:id. Ein Urlaub eines anderen Users ist hier
        // "nicht gefunden", damit die API nicht verrät, dass es ihn gibt.
        const id = IdSchema.parse(params.id);

        if (req.method === "GET") {
            const row = await getVacation(db, id);
            if (row?.userId !== userId) return notFound();
            return Response.json(row);
        }

        if (req.method === "PATCH") {
            const patch = VacationUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }

            await db.transaction(async (tx) => {
                const current = await getVacation(tx, id);
                if (current?.userId !== userId) throw new NotFoundError();
                await lockUser(tx, userId);

                // Wurde nur ein Datum gesendet, gilt für das andere der gespeicherte Wert
                const next = {
                    id,
                    startDate: patch.startDate ?? current.startDate,
                    endDate: patch.endDate ?? current.endDate,
                };
                const problem = checkRange(next.startDate, next.endDate);
                if (problem) throw new RuleError(problem);

                const existing = await userVacations(tx, userId);
                const clash = findOverlap(existing, next);
                if (clash) throw new RuleError(overlapMessage(clash));
                const overLimit = checkYearLimit(
                    existing,
                    next,
                    await userHolidays(tx, userId),
                    await userSickLeaves(tx, userId),
                    await loadSettingHistory(userId, VACATION_DAYS_SETTING_ID, tx),
                );
                if (overLimit) throw new RuleError(overLimit);

                await tx.update(vacations).set(patch).where(eq(vacations.id, id));
            });
            return Response.json(await getVacation(db, id));
        }

        if (req.method === "DELETE") {
            const row = await getVacation(db, id);
            if (row?.userId !== userId) return notFound();
            const [result] = await db.delete(vacations).where(eq(vacations.id, id));
            return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
        }

        return new Response(null, {status: 405});
    } catch (err) {
        console.log("---> Fehlerbehandlung in vacations", err);

        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (err instanceof RuleError) return ruleViolation(err);
        if (err instanceof NotFoundError) return notFound();
        if (err instanceof ForbiddenError) return forbidden();
        if (err instanceof UnknownUserError || hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "User existiert nicht"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("vacations", withSession(handler));

export const config: Config = {path: ["/api/users/:userId/vacations", "/api/users/:userId/vacations/:id"]};
