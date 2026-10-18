// netlify/functions/auth.ts
import type {Config, Context} from "@netlify/functions";
import {eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {users} from "../../db/schema";
import {LoginSchema, PasswordChangeSchema, PasswordResetSchema} from "../../shared/auth";
import {withTiming} from "./lib/timing";
import {isApiPath, notFound, pathParams} from "./lib/id";
import {hashPassword, verifyPassword} from "./lib/password";
import {forbidden, hasEndpointAccess} from "./lib/roles";
import {
    clearSessionCookie,
    createSession,
    deleteSession,
    deleteUserSessions,
    getSession,
    type Session,
    unauthorized,
} from "./lib/session";

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const getPasswordHash = async (userId: string) => {
    const [row] = await db.select({passwordHash: users.passwordHash}).from(users).where(eq(users.id, userId)).limit(1);
    return row?.passwordHash ?? null;
};

// POST /api/auth/login: gleiche Meldung für unbekannte E-Mail und falsches Passwort
async function login(req: Request): Promise<Response> {
    const {email, password} = LoginSchema.parse(await readBody(req));
    const [row] = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (!(await verifyPassword(password, row?.passwordHash ?? null)) || !row) {
        return Response.json({error: "E-Mail oder Passwort ist falsch"}, {status: 401});
    }

    const {passwordHash: _, ...user} = row;
    return Response.json(user, {headers: {"Set-Cookie": await createSession(req, user.id)}});
}

// POST /api/auth/logout: immer erfolgreich, auch ohne gültige Session
async function logout(req: Request, session: Session | null): Promise<Response> {
    if (session) await deleteSession(session.idHash);
    return new Response(null, {status: 204, headers: {"Set-Cookie": clearSessionCookie(req)}});
}

// POST /api/auth/password: eigenes Passwort ändern, die anderen Sessions des Users enden
async function changePassword(req: Request, session: Session): Promise<Response> {
    const {oldPassword, newPassword} = PasswordChangeSchema.parse(await readBody(req));
    if (!(await verifyPassword(oldPassword, await getPasswordHash(session.user.id)))) {
        return Response.json({error: "Das bisherige Passwort ist falsch"}, {status: 400});
    }
    await db
        .update(users)
        .set({passwordHash: await hashPassword(newPassword)})
        .where(eq(users.id, session.user.id));
    await deleteUserSessions(session.user.id, session.idHash);
    return new Response(null, {status: 204});
}

// POST /api/auth/reset-password: der Admin setzt ein neues Passwort, alle Sessions des Users enden.
// Die Rolle steht in endpoint_roles unter dem konkreten Pfad, denn /api/auth/:action umfasst
// auch Login, Logout und /me, und die laufen ohne Rollenprüfung.
async function resetPassword(req: Request, session: Session): Promise<Response> {
    if (!(await hasEndpointAccess(session.user.id, "/api/auth/reset-password", req.method))) return forbidden();
    const {userId, password} = PasswordResetSchema.parse(await readBody(req));
    const [result] = await db
        .update(users)
        .set({passwordHash: await hashPassword(password)})
        .where(eq(users.id, userId));
    if (result.affectedRows === 0) return notFound();
    await deleteUserSessions(userId);
    return new Response(null, {status: 204});
}

const handler = async (req: Request, _context: Context) => {
    try {
        if (!isApiPath(req.url, "auth")) return notFound();
        // Netlify wiederholt eine 403 mit /api/auth/reset-password.html usw., die Wiederholung bekommt
        // wieder 403 (siehe isApiPath und pathParams in lib/id.ts)
        const action = pathParams(req.url, config.path).action;

        if (action === "login") {
            return req.method === "POST" ? await login(req) : new Response(null, {status: 405});
        }

        const session = await getSession(req);

        if (action === "logout") {
            return req.method === "POST" ? await logout(req, session) : new Response(null, {status: 405});
        }

        if (!session) return unauthorized();

        switch (action) {
            case "me":
                return req.method === "GET" ? Response.json(session.user) : new Response(null, {status: 405});
            case "password":
                return req.method === "POST" ? await changePassword(req, session) : new Response(null, {status: 405});
            case "reset-password":
                return req.method === "POST" ? await resetPassword(req, session) : new Response(null, {status: 405});
            default:
                return notFound();
        }
    } catch (err) {
        if (err instanceof z.ZodError) {
            return Response.json({errors: err.issues}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("auth", handler);

export const config: Config = {path: "/api/auth/:action"};
