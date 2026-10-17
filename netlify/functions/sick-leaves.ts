import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {and, asc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {sickLeaves, users} from "../../db/schema";
import {checkSickLeave} from "../../shared/sick-leave-rules";
import {SickLeaveCreateSchema, SickLeaveUpdateSchema} from "../../shared/sick-leave";
import {IdSchema, isApiPath, notFound} from "./lib/id";
import {withSession} from "./lib/session";
import {RuleError, ruleViolation} from "./lib/rule-error";

// Die Buchungen werden weder geprüft noch geändert: an Krankheitstagen zählen sie nur nicht zur Arbeitszeit

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

class NotFoundError extends Error {}

class UnknownUserError extends Error {}

const ListQuerySchema = z.object({userId: z.string().uuid().optional()});

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

const handler = async (req: Request, context: Context) => {
    try {
        if (!isApiPath(req.url, "sick-leaves")) return notFound();
        const url = new URL(req.url);
        const rawId = context.params.id;

        // Sammlung: /api/sick-leaves
        if (rawId === undefined) {
            if (req.method === "GET") {
                const q = ListQuerySchema.parse(Object.fromEntries(url.searchParams));
                const rows = await db
                    .select()
                    .from(sickLeaves)
                    .where(and(q.userId ? eq(sickLeaves.userId, q.userId) : undefined))
                    .orderBy(asc(sickLeaves.startDate));
                return Response.json(rows);
            }

            if (req.method === "POST") {
                const input = SickLeaveCreateSchema.parse(await readBody(req));
                const id = randomUUID();
                await db.transaction(async (tx) => {
                    await lockUser(tx, input.userId);
                    const existing = await userSickLeaves(tx, input.userId);
                    const problem = checkSickLeave(existing, {id, startDate: input.startDate, endDate: input.endDate});
                    if (problem) throw new RuleError(problem);
                    await tx.insert(sickLeaves).values({id, ...input});
                });
                return Response.json(await getSickLeave(db, id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelne Krankmeldung: /api/sick-leaves/:id
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            const row = await getSickLeave(db, id);
            return row ? Response.json(row) : notFound();
        }

        if (req.method === "PATCH") {
            const patch = SickLeaveUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }

            await db.transaction(async (tx) => {
                const current = await getSickLeave(tx, id);
                if (!current) throw new NotFoundError();
                await lockUser(tx, current.userId);

                // Wurde nur ein Datum gesendet, gilt für das andere der gespeicherte Wert
                const next = {
                    id,
                    startDate: patch.startDate ?? current.startDate,
                    endDate: patch.endDate ?? current.endDate,
                };
                const problem = checkSickLeave(await userSickLeaves(tx, current.userId), next);
                if (problem) throw new RuleError(problem);

                await tx.update(sickLeaves).set(patch).where(eq(sickLeaves.id, id));
            });
            return Response.json(await getSickLeave(db, id));
        }

        if (req.method === "DELETE") {
            const [result] = await db.delete(sickLeaves).where(eq(sickLeaves.id, id));
            return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (err instanceof RuleError) return ruleViolation(err);
        if (err instanceof NotFoundError) return notFound();
        if (err instanceof UnknownUserError || hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "User existiert nicht"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("sick-leaves", withSession(handler));

export const config: Config = {path: ["/api/sick-leaves", "/api/sick-leaves/:id"]};
