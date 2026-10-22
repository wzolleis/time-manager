import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {asc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {sickLeaves, users} from "../../db/schema";
import {checkSickLeave} from "../../shared/sick-leave-rules";
import {SickLeaveCreateSchema, SickLeaveUpdateSchema} from "../../shared/sick-leave";
import {IdSchema, isRoutePath, notFound, pathParams} from "./lib/id";
import {ensureAccess, forbidden, ForbiddenError} from "./lib/roles";
import {type Session, withSession} from "./lib/session";
import {RuleError, ruleViolation} from "./lib/rule-error";

// Die Buchungen werden weder geprüft noch geändert: an Krankheitstagen zählen sie nur nicht zur Arbeitszeit

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

class NotFoundError extends Error {}

class UnknownUserError extends Error {}

const getSickLeave = async (ex: Executor, id: string) => {
    const [row] = await ex.select().from(sickLeaves).where(eq(sickLeaves.id, id)).limit(1);
    return row ?? null;
};

// Sperrt die Zeile des Users bis zum Ende der Transaktion und prüft, dass er existiert
const lockUser = async (tx: Tx, userId: string) => {
    const rows = await tx.select({id: users.id}).from(users).where(eq(users.id, userId)).for("update");
    if (rows.length === 0) throw new UnknownUserError();
};

const userSickLeaves = (tx: Tx, userId: string) => tx.select().from(sickLeaves).where(eq(sickLeaves.userId, userId));

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
        // Der Pfad sagt, wem die Krankmeldungen gehören: der User selbst oder ein Administrator
        const userId = IdSchema.parse(params.userId);
        await ensureAccess(session.user.id, userId);

        // Sammlung: /api/users/:userId/sick-leaves
        if (params.id === undefined) {
            if (req.method === "GET") {
                const rows = await db
                    .select()
                    .from(sickLeaves)
                    .where(eq(sickLeaves.userId, userId))
                    .orderBy(asc(sickLeaves.startDate));
                return Response.json(rows);
            }

            if (req.method === "POST") {
                const input = SickLeaveCreateSchema.parse(await readBody(req));
                const id = randomUUID();
                await db.transaction(async (tx) => {
                    await lockUser(tx, userId);
                    const existing = await userSickLeaves(tx, userId);
                    const problem = checkSickLeave(existing, {id, startDate: input.startDate, endDate: input.endDate});
                    if (problem) throw new RuleError(problem);
                    await tx.insert(sickLeaves).values({id, userId, ...input});
                });
                return Response.json(await getSickLeave(db, id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelne Krankmeldung: /api/users/:userId/sick-leaves/:id. Eine Krankmeldung eines anderen Users
        // ist hier "nicht gefunden", damit die API nicht verrät, dass es sie gibt.
        const id = IdSchema.parse(params.id);

        if (req.method === "GET") {
            const row = await getSickLeave(db, id);
            if (row?.userId !== userId) return notFound();
            return Response.json(row);
        }

        if (req.method === "PATCH") {
            const patch = SickLeaveUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }

            await db.transaction(async (tx) => {
                const current = await getSickLeave(tx, id);
                if (current?.userId !== userId) throw new NotFoundError();
                await lockUser(tx, userId);

                // Wurde nur ein Datum gesendet, gilt für das andere der gespeicherte Wert
                const next = {
                    id,
                    startDate: patch.startDate ?? current.startDate,
                    endDate: patch.endDate ?? current.endDate,
                };
                const problem = checkSickLeave(await userSickLeaves(tx, userId), next);
                if (problem) throw new RuleError(problem);

                await tx.update(sickLeaves).set(patch).where(eq(sickLeaves.id, id));
            });
            return Response.json(await getSickLeave(db, id));
        }

        if (req.method === "DELETE") {
            const row = await getSickLeave(db, id);
            if (row?.userId !== userId) return notFound();
            const [result] = await db.delete(sickLeaves).where(eq(sickLeaves.id, id));
            return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
        }

        return new Response(null, {status: 405});
    } catch (err) {
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

export default withTiming("sick-leaves", withSession(handler));

export const config: Config = {path: ["/api/users/:userId/sick-leaves", "/api/users/:userId/sick-leaves/:id"]};
