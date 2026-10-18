import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {and, asc, desc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {withTiming} from "./lib/timing";
import {apiTokens, users} from "../../db/schema";
import {ApiTokenCreateSchema} from "../../shared/api-token";
import {tokenExpiry} from "../../shared/api-token-rules";
import {generateApiToken, hashApiToken} from "./lib/api-token";
import {IdSchema, isApiPath, notFound, pathParams} from "./lib/id";
import {type Session, withSession} from "./lib/session";

// Der Hash verlässt nie das Backend
const tokenColumns = {
    id: apiTokens.id,
    userId: apiTokens.userId,
    name: apiTokens.name,
    createdAt: apiTokens.createdAt,
    lastUsedAt: apiTokens.lastUsedAt,
    expiresAt: apiTokens.expiresAt,
};

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const deleted = (affectedRows: number) => (affectedRows > 0 ? new Response(null, {status: 204}) : notFound());

// Eigene Tokens des angemeldeten Users: /api/api-tokens
async function ownTokens(req: Request, id: string | undefined, session: Session): Promise<Response> {
    const userId = session.user.id;

    if (id === undefined) {
        if (req.method === "GET") {
            const rows = await db
                .select(tokenColumns)
                .from(apiTokens)
                .where(eq(apiTokens.userId, userId))
                .orderBy(desc(apiTokens.createdAt));
            return Response.json(rows);
        }

        if (req.method === "POST") {
            const input = ApiTokenCreateSchema.parse(await readBody(req));
            const token = generateApiToken();
            // ohne Millisekunden, wie die Spalte sie speichert
            const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000);
            const row = {
                id: randomUUID(),
                userId,
                name: input.name,
                createdAt,
                lastUsedAt: null,
                expiresAt: tokenExpiry(createdAt, input.expiresInDays),
            };
            await db.insert(apiTokens).values({...row, tokenHash: hashApiToken(token)});
            return Response.json({...row, token}, {status: 201}); // das einzige Mal, dass das Token herausgeht
        }
        return new Response(null, {status: 405});
    }

    if (req.method === "DELETE") {
        // Ein fremdes Token ist für den User unbekannt
        const [result] = await db
            .delete(apiTokens)
            .where(and(eq(apiTokens.id, IdSchema.parse(id)), eq(apiTokens.userId, userId)));
        return deleted(result.affectedRows);
    }
    return new Response(null, {status: 405});
}

// Tokens aller User für den Administrator: /api/admin/api-tokens (Rolle über endpoint_roles)
async function allTokens(req: Request, id: string | undefined): Promise<Response> {
    if (id === undefined) {
        if (req.method === "GET") {
            const rows = await db
                .select({...tokenColumns, userName: users.name})
                .from(apiTokens)
                .innerJoin(users, eq(users.id, apiTokens.userId))
                .orderBy(asc(users.name), desc(apiTokens.createdAt));
            return Response.json(rows);
        }
        return new Response(null, {status: 405});
    }

    if (req.method === "DELETE") {
        const [result] = await db.delete(apiTokens).where(eq(apiTokens.id, IdSchema.parse(id)));
        return deleted(result.affectedRows);
    }
    return new Response(null, {status: 405});
}

// Jeder User verwaltet nur seine eigenen Tokens, ein Administrator sieht und widerruft die aller User.
// Erzeugen kann ein Token nur der User selbst.
const handler = async (req: Request, _context: Context, session: Session) => {
    try {
        const admin = isApiPath(req.url, "admin/api-tokens");
        if (!admin && !isApiPath(req.url, "api-tokens")) return notFound();
        const id = pathParams(req.url, config.path).id;
        return admin ? await allTokens(req, id) : await ownTokens(req, id, session);
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("api-tokens", withSession(handler));

export const config: Config = {
    path: ["/api/api-tokens", "/api/api-tokens/:id", "/api/admin/api-tokens", "/api/admin/api-tokens/:id"],
};
