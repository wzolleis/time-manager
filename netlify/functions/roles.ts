// netlify/functions/roles.ts
import type {Config, Context} from "@netlify/functions";
import {asc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {roles, userRoles, users} from "../../db/schema";
import {ADMIN_ROLE_ID, UserRolesSchema} from "../../shared/role";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {IdSchema, notFound} from "./lib/id";
import {withSession} from "./lib/session";
import {lastAdmin, lockAdmins} from "./lib/roles";

// Nur diese beiden Pfade, alles andere (auch Netlifys .html-Varianten) bekommt 410 ohne DB-Zugriff
const isRolesPath = (url: string) =>
    /^(\/api|\/\.netlify\/functions)\/(roles|users\/[^/.]+\/roles)\/?$/.test(new URL(url).pathname);

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

type Db = Pick<typeof db, "select">;

// Die Rollen eines Users mit id und Name, sortiert nach Name
const getUserRoles = async (tx: Db, userId: string) =>
    tx
        .select({id: roles.id, name: roles.name})
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, userId))
        .orderBy(asc(roles.name));

const userExists = async (tx: Db, id: string) =>
    (await tx.select({id: users.id}).from(users).where(eq(users.id, id)).limit(1)).length > 0;

const handler = async (req: Request, context: Context) => {
    try {
        if (!isRolesPath(req.url)) return notFound();
        const rawId = context.params.id;

        // Alle Rollen: /api/roles
        if (rawId === undefined) {
            if (req.method !== "GET") return new Response(null, {status: 405});
            return Response.json(
                await db
                    .select({
                        id: roles.id,
                        name: roles.name,
                    })
                    .from(roles)
                    .orderBy(asc(roles.name)),
            );
        }

        // Rollen eines Users: /api/users/:id/roles
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            if (!(await userExists(db, id))) return notFound();
            return Response.json(await getUserRoles(db, id));
        }

        if (req.method === "PUT") {
            const wanted = [...new Set(UserRolesSchema.parse(await readBody(req)).roleIds)];
            return await db.transaction(async (tx) => {
                const admins = await lockAdmins(tx);
                if (!(await userExists(tx, id))) return notFound();
                // Den letzten Administrator nicht entmachten
                if (admins.length === 1 && admins[0] === id && !wanted.includes(ADMIN_ROLE_ID)) return lastAdmin();

                await tx.delete(userRoles).where(eq(userRoles.userId, id));
                if (wanted.length > 0) {
                    await tx.insert(userRoles).values(wanted.map((roleId) => ({userId: id, roleId})));
                }
                return Response.json(await getUserRoles(tx, id));
            });
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) {
            return Response.json({errors: err.issues}, {status: 400});
        }
        if (hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "Unbekannte Rolle"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("roles", withSession(handler));

export const config: Config = {path: ["/api/roles", "/api/users/:id/roles"]};
