// netlify/functions/lib/session.ts
import {createHash, randomBytes} from "node:crypto";
import type {Context} from "@netlify/functions";
import {and, eq, lt, ne} from "drizzle-orm";
import {db} from "./db";
import {sessions, users} from "../../../db/schema";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 Stunden Inaktivität
// Die Verlängerung wird höchstens einmal pro Minute geschrieben, nicht bei jedem Aufruf
const REFRESH_AFTER_MS = 60 * 1000;

export type SessionUser = { id: string; name: string; email: string; avatarUrl: string | null };
export type Session = { user: SessionUser; idHash: string };

type Handler = (req: Request, context: Context) => Promise<Response>;
type AuthedHandler = (req: Request, context: Context, session: Session) => Promise<Response>;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const cookie = (value: string, maxAgeSeconds: number) =>
    `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;

export const clearSessionCookie = () => cookie("", 0);

function readSessionId(req: Request): string | null {
    const header = req.headers.get("Cookie");
    if (!header) return null;
    for (const part of header.split(";")) {
        const [name, ...rest] = part.trim().split("=");
        if (name === SESSION_COOKIE) return rest.join("=") || null;
    }
    return null;
}

/** Legt eine neue Session an und liefert den Set-Cookie-Header dafür */
export async function createSession(userId: string): Promise<string> {
    const id = randomBytes(32).toString("base64url");
    const now = new Date();
    // Abgelaufene Sessions bei der Gelegenheit aufräumen, damit die Tabelle nicht wächst
    await db.delete(sessions).where(lt(sessions.expiresAt, now));
    await db.insert(sessions).values({
        idHash: sha256(id),
        userId,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    });
    return cookie(id, SESSION_TTL_MS / 1000);
}

/** Liest die Session aus dem Cookie, verlängert sie und liefert den User; null wenn nicht angemeldet */
export async function getSession(req: Request): Promise<Session | null> {
    const id = readSessionId(req);
    if (!id) return null;
    const idHash = sha256(id);

    const [row] = await db
        .select({
            expiresAt: sessions.expiresAt,
            user: {id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl},
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(eq(sessions.idHash, idHash))
        .limit(1);

    const now = Date.now();
    if (!row || row.expiresAt.getTime() <= now) return null;

    if (row.expiresAt.getTime() - now < SESSION_TTL_MS - REFRESH_AFTER_MS) {
        await db
            .update(sessions)
            .set({expiresAt: new Date(now + SESSION_TTL_MS)})
            .where(eq(sessions.idHash, idHash));
    }
    return {user: row.user, idHash};
}

export async function deleteSession(idHash: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.idHash, idHash));
}

/** Löscht alle Sessions eines Users, optional bis auf eine (die aktuelle) */
export async function deleteUserSessions(userId: string, exceptIdHash?: string): Promise<void> {
    await db
        .delete(sessions)
        .where(
            exceptIdHash
                ? and(eq(sessions.userId, userId), ne(sessions.idHash, exceptIdHash))
                : eq(sessions.userId, userId),
        );
}

export const unauthorized = () => Response.json({error: "Anmeldung erforderlich"}, {status: 401});

/** Umhüllt einen Handler: ohne gültige Session gibt es 401, sonst bekommt der Handler die Session */
export function withSession(handler: AuthedHandler): Handler {
    return async (req, context) => {
        let session: Session | null;
        try {
            session = await getSession(req);
        } catch (err) {
            console.error(err);
            return Response.json({error: "Interner Fehler"}, {status: 500});
        }
        if (!session) return unauthorized();
        return handler(req, context, session);
    };
}
