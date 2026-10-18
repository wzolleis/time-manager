// netlify/functions/lib/api-token.ts
import {createHash, randomBytes} from "node:crypto";
import type {Context} from "@netlify/functions";
import {eq} from "drizzle-orm";
import {db} from "./db";
import {apiTokens, users} from "../../../db/schema";
import {API_TOKEN_PREFIX, isTokenExpired} from "../../../shared/api-token-rules";
import {endpointPath, forbidden, hasEndpointAccess} from "./roles";
import type {SessionUser} from "./session";

// lastUsedAt wird höchstens einmal pro Minute geschrieben, wie die Verlängerung der Session
const TOUCH_AFTER_MS = 60 * 1000;

export type TokenSession = {user: SessionUser};

type Handler = (req: Request, context: Context) => Promise<Response>;
type TokenHandler = (req: Request, context: Context, session: TokenSession) => Promise<Response>;

/** Ein neues Token: Präfix und 32 zufällige Bytes */
export const generateApiToken = (): string => API_TOKEN_PREFIX + randomBytes(32).toString("base64url");

export const hashApiToken = (token: string): string => createHash("sha256").update(token).digest("hex");

/** Das Token aus "Authorization: Bearer tm_…", sonst null. Das Schema ist unabhängig von Groß- und Kleinschreibung. */
export function readBearerToken(header: string | null): string | null {
    const match = header?.match(/^Bearer +(\S+)\s*$/i);
    const token = match?.[1];
    return token?.startsWith(API_TOKEN_PREFIX) ? token : null;
}

/** Der User zum Token aus dem Header; null bei fehlendem, unbekanntem oder abgelaufenem Token */
export async function getTokenUser(req: Request): Promise<SessionUser | null> {
    const token = readBearerToken(req.headers.get("Authorization"));
    if (!token) return null;
    const tokenHash = hashApiToken(token);

    const [row] = await db
        .select({
            id: apiTokens.id,
            expiresAt: apiTokens.expiresAt,
            lastUsedAt: apiTokens.lastUsedAt,
            user: {id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl},
        })
        .from(apiTokens)
        .innerJoin(users, eq(users.id, apiTokens.userId))
        .where(eq(apiTokens.tokenHash, tokenHash))
        .limit(1);

    const now = new Date();
    if (!row || isTokenExpired(row.expiresAt, now)) return null;

    if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > TOUCH_AFTER_MS) {
        await db.update(apiTokens).set({lastUsedAt: now}).where(eq(apiTokens.id, row.id));
    }
    return row.user;
}

export const tokenRequired = () =>
    Response.json({error: "Gültiges Agent-Token erforderlich"}, {status: 401, headers: {"WWW-Authenticate": "Bearer"}});

/**
 * Umhüllt einen Handler für Agents: ohne gültiges Token gibt es 401, ohne die Rolle für Endpoint und
 * Methode (Tabelle endpoint_roles) 403, sonst bekommt der Handler den User des Tokens.
 * Das Session-Cookie zählt hier nicht.
 */
export function withToken(handler: TokenHandler): Handler {
    return async (req, context) => {
        let user: SessionUser | null;
        let allowed: boolean;
        try {
            user = await getTokenUser(req);
            if (!user) return tokenRequired();
            allowed = await hasEndpointAccess(user.id, endpointPath(req.url), req.method);
        } catch (err) {
            console.error(err);
            return Response.json({error: "Interner Fehler"}, {status: 500});
        }
        if (!allowed) return forbidden();
        return handler(req, context, {user});
    };
}
