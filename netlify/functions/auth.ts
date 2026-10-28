// netlify/functions/auth.ts
import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {eq} from "drizzle-orm";
import {z} from "zod";
import {
    type AuthenticationResponseJSON,
    generateAuthenticationOptions,
    generateRegistrationOptions,
    type RegistrationResponseJSON,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from "@simplewebauthn/server";
import {isoBase64URL} from "@simplewebauthn/server/helpers";
import {db} from "./lib/db";
import {passkeys, users} from "../../db/schema";
import {LoginSchema, PasswordChangeSchema, PasswordResetSchema} from "../../shared/auth";
import {CREDENTIAL_ID_MAX_LENGTH, PasskeyLoginSchema, PasskeyRegisterSchema} from "../../shared/passkey";
import {hasDbCode} from "./lib/db-errors";
import {consumeChallenge, RP_NAME, relyingParty, saveChallenge} from "./lib/passkey";
import {withTiming} from "./lib/timing";
import {isApiPath, notFound, pathParams} from "./lib/id";
import {hashPassword, verifyPassword} from "./lib/password";
import {forbidden, hasEndpointAccess, roleIdsOf} from "./lib/roles";
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

// Der angemeldete User mit seinen Rollen: daran erkennt der Client, ob er das Administrator-Menü zeigt
const withRoles = async <T extends {id: string}>(user: T) => ({...user, roleIds: await roleIdsOf(user.id)});

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
    return Response.json(await withRoles(user), {headers: {"Set-Cookie": await createSession(req, user.id)}});
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
    // Der Zugang wird neu vergeben, ein Passkey eines Angreifers soll den Reset nicht überleben
    await db.delete(passkeys).where(eq(passkeys.userId, userId));
    return new Response(null, {status: 204});
}

const splitTransports = (transports: string | null) => transports?.split(",") ?? undefined;

// POST /api/auth/passkey-login-options: ohne Session und ohne E-Mail, der Browser bietet die Passkeys der Domain an
async function passkeyLoginOptions(req: Request): Promise<Response> {
    const options = await generateAuthenticationOptions({
        rpID: relyingParty(req.url).rpID,
        userVerification: "required",
    });
    await saveChallenge(options.challenge, "authentication", null);
    return Response.json(options);
}

const passkeyLoginFailed = () => Response.json({error: "Anmeldung mit Passkey fehlgeschlagen"}, {status: 401});

// POST /api/auth/passkey-login: gleiche Meldung für unbekannten Passkey und gescheiterte Prüfung
async function passkeyLogin(req: Request): Promise<Response> {
    const {response} = PasskeyLoginSchema.parse(await readBody(req));
    const [row] = await db
        .select({
            passkey: {
                id: passkeys.id,
                publicKey: passkeys.publicKey,
                counter: passkeys.counter,
                transports: passkeys.transports,
            },
            user: {id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl},
        })
        .from(passkeys)
        .innerJoin(users, eq(users.id, passkeys.userId))
        .where(eq(passkeys.credentialId, response.id))
        .limit(1);
    if (!row) return passkeyLoginFailed();

    const {rpID, origin} = relyingParty(req.url);
    let newCounter: number;
    try {
        const verification = await verifyAuthenticationResponse({
            response: response as unknown as AuthenticationResponseJSON, // Form geprüft, Inhalt prüft die Bibliothek
            expectedChallenge: (challenge) => consumeChallenge(challenge, "authentication", null),
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: response.id,
                publicKey: isoBase64URL.toBuffer(row.passkey.publicKey),
                counter: row.passkey.counter,
                transports: splitTransports(row.passkey.transports),
            },
            requireUserVerification: true,
        });
        if (!verification.verified) return passkeyLoginFailed();
        newCounter = verification.authenticationInfo.newCounter;
    } catch (err) {
        console.warn("Passkey-Anmeldung abgelehnt:", err);
        return passkeyLoginFailed();
    }

    await db.update(passkeys).set({counter: newCounter, lastUsedAt: new Date()}).where(eq(passkeys.id, row.passkey.id));
    return Response.json(await withRoles(row.user), {
        headers: {"Set-Cookie": await createSession(req, row.user.id)},
    });
}

// POST /api/auth/passkey-register-options: Optionen für einen neuen Passkey des angemeldeten Users
async function passkeyRegisterOptions(req: Request, session: Session): Promise<Response> {
    const existing = await db
        .select({credentialId: passkeys.credentialId, transports: passkeys.transports})
        .from(passkeys)
        .where(eq(passkeys.userId, session.user.id));
    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: relyingParty(req.url).rpID,
        // Dieselbe User-ID bei jedem Eintragen: das Gerät ersetzt dann einen eigenen Passkey, statt einen zweiten anzulegen
        userID: new TextEncoder().encode(session.user.id),
        userName: session.user.email,
        userDisplayName: session.user.name,
        attestationType: "none",
        // Ein Gerät, das schon einen Passkey des Users hat, lehnt der Browser ab
        excludeCredentials: existing.map((p) => ({id: p.credentialId, transports: splitTransports(p.transports)})),
        authenticatorSelection: {residentKey: "required", userVerification: "required"},
    });
    await saveChallenge(options.challenge, "registration", session.user.id);
    return Response.json(options);
}

const passkeyInvalid = () => Response.json({error: "Der Passkey konnte nicht geprüft werden"}, {status: 400});

// POST /api/auth/passkey-register: Antwort des Browsers prüfen und den Passkey speichern
async function passkeyRegister(req: Request, session: Session): Promise<Response> {
    const {name, response} = PasskeyRegisterSchema.parse(await readBody(req));
    const {rpID, origin} = relyingParty(req.url);
    let info;
    try {
        const verification = await verifyRegistrationResponse({
            response: response as unknown as RegistrationResponseJSON, // Form geprüft, Inhalt prüft die Bibliothek
            expectedChallenge: (challenge) => consumeChallenge(challenge, "registration", session.user.id),
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true,
        });
        if (!verification.verified) return passkeyInvalid();
        info = verification.registrationInfo;
    } catch (err) {
        console.warn("Passkey abgelehnt:", err);
        return passkeyInvalid();
    }
    if (info.credential.id.length > CREDENTIAL_ID_MAX_LENGTH) return passkeyInvalid();

    const passkey = {
        id: randomUUID(),
        userId: session.user.id,
        name,
        backedUp: info.credentialBackedUp,
        // ohne Millisekunden, wie die Spalte sie speichert
        createdAt: new Date(Math.floor(Date.now() / 1000) * 1000),
        lastUsedAt: null,
    };
    try {
        await db.insert(passkeys).values({
            ...passkey,
            credentialId: info.credential.id,
            publicKey: isoBase64URL.fromBuffer(info.credential.publicKey),
            counter: info.credential.counter,
            transports: info.credential.transports?.join(",") || null,
        });
    } catch (err) {
        if (hasDbCode(err, "ER_DUP_ENTRY")) {
            return Response.json({error: "Dieser Passkey ist schon eingetragen"}, {status: 409});
        }
        throw err;
    }
    return Response.json(passkey, {status: 201});
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
        if (action === "passkey-login-options") {
            return req.method === "POST" ? await passkeyLoginOptions(req) : new Response(null, {status: 405});
        }
        if (action === "passkey-login") {
            return req.method === "POST" ? await passkeyLogin(req) : new Response(null, {status: 405});
        }

        const session = await getSession(req);

        if (action === "logout") {
            return req.method === "POST" ? await logout(req, session) : new Response(null, {status: 405});
        }

        if (!session) return unauthorized();

        switch (action) {
            case "me":
                return req.method === "GET"
                    ? Response.json(await withRoles(session.user))
                    : new Response(null, {status: 405});
            case "password":
                return req.method === "POST" ? await changePassword(req, session) : new Response(null, {status: 405});
            case "reset-password":
                return req.method === "POST" ? await resetPassword(req, session) : new Response(null, {status: 405});
            case "passkey-register-options":
                return req.method === "POST"
                    ? await passkeyRegisterOptions(req, session)
                    : new Response(null, {status: 405});
            case "passkey-register":
                return req.method === "POST" ? await passkeyRegister(req, session) : new Response(null, {status: 405});
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
