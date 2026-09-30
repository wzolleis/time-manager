// netlify/functions/users.ts
import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {asc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {users} from "../../db/schema";
import {UserCreateSchema, UserUpdateSchema} from "../../shared/user";

const IdSchema = z.string().uuid();

const getUser = async (id: string) => {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
};

// Drizzle verpackt DB-Fehler teils in "cause", deshalb die Kette durchsuchen
const isDuplicate = (err: unknown): boolean => {
    let e: unknown = err;
    while (typeof e === "object" && e !== null) {
        const {code, cause} = e as { code?: unknown; cause?: unknown };
        if (code === "ER_DUP_ENTRY") return true;
        e = cause;
    }
    return false;
};

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const notFound = () => new Response(null, {status: 404});

export default async (req: Request, context: Context) => {
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
        if (isDuplicate(err)) {
            return Response.json({error: "Diese E-Mail existiert bereits"}, {status: 409});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export const config: Config = {path: ["/api/users", "/api/users/:id"]};