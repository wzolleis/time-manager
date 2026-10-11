// netlify/functions/users.ts
import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {asc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {users} from "../../db/schema";
import {UserCreateSchema, UserUpdateSchema} from "../../shared/user";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";

const IdSchema = z.uuid();


const getUser = async (id: string) => {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
};

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const notFound = () => new Response(null, {status: 404});

const handler = async (req: Request, context: Context) => {
    try {
        const rawId = context.params.id;

        // Sammlung: /api/users
        if (rawId === undefined) {
            if (req.method === "GET") {
                return Response.json(await db.select().from(users).orderBy(asc(users.name)));
            }
            if (req.method === "POST") {
                const input = UserCreateSchema.parse(await readBody(req));
                const id = randomUUID();
                await db.insert(users).values({id, ...input});
                return Response.json(await getUser(id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelner User: /api/users/:id
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            const user = await getUser(id);
            return user ? Response.json(user) : notFound();
        }

        if (req.method === "PATCH") {
            const patch = UserUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }
            if (!(await getUser(id))) return notFound();
            await db.update(users).set(patch).where(eq(users.id, id));
            return Response.json(await getUser(id));
        }

        if (req.method === "DELETE") {
            const [result] = await db.delete(users).where(eq(users.id, id));
            return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) {
            return Response.json({errors: err.issues}, {status: 400});
        }
        if (hasDbCode(err, "ER_DUP_ENTRY")) {
            return Response.json({error: "Diese E-Mail existiert bereits"}, {status: 409});
        }
        if (hasDbCode(err, "ER_ROW_IS_REFERENCED_2")) {
            return Response.json(
                {error: "User hat noch Zeitbuchungen oder Urlaube und kann nicht gelöscht werden"},
                {status: 409},
            );
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("users", handler);

export const config: Config = {path: ["/api/users", "/api/users/:id"]};