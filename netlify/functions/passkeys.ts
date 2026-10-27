import type {Config, Context} from "@netlify/functions";
import {and, desc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {withTiming} from "./lib/timing";
import {passkeys} from "../../db/schema";
import {IdSchema, isApiPath, notFound, pathParams} from "./lib/id";
import {type Session, withSession} from "./lib/session";

// Schlüssel, Zähler und credentialId verlassen nie das Backend
const passkeyColumns = {
    id: passkeys.id,
    userId: passkeys.userId,
    name: passkeys.name,
    backedUp: passkeys.backedUp,
    createdAt: passkeys.createdAt,
    lastUsedAt: passkeys.lastUsedAt,
};

// Eigene Passkeys des angemeldeten Users. Eingetragen wird über /api/auth/passkey-register,
// weil dafür eine Challenge nötig ist.
const handler = async (req: Request, _context: Context, session: Session) => {
    try {
        if (!isApiPath(req.url, "passkeys")) return notFound();
        const id = pathParams(req.url, config.path).id;
        const userId = session.user.id;

        if (id === undefined) {
            if (req.method !== "GET") return new Response(null, {status: 405});
            const rows = await db
                .select(passkeyColumns)
                .from(passkeys)
                .where(eq(passkeys.userId, userId))
                .orderBy(desc(passkeys.createdAt));
            return Response.json(rows);
        }

        if (req.method !== "DELETE") return new Response(null, {status: 405});
        // Ein fremder Passkey ist für den User unbekannt
        const [result] = await db
            .delete(passkeys)
            .where(and(eq(passkeys.id, IdSchema.parse(id)), eq(passkeys.userId, userId)));
        return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("passkeys", withSession(handler));

export const config: Config = {path: ["/api/passkeys", "/api/passkeys/:id"]};
