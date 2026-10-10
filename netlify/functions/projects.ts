import type {Config, Context} from "@netlify/functions";
import {randomUUID} from "node:crypto";
import {asc, eq} from "drizzle-orm";
import {z} from "zod";
import {db} from "./lib/db";
import {hasDbCode} from "./lib/db-errors";
import {projects} from "../../db/schema";
import {ProjectCreateSchema, ProjectUpdateSchema} from "../../shared/time-entry";
import {withTiming} from "./lib/timing";

const IdSchema = z.uuid();

const getProject = async (id: string) => {
    const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
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

        // Sammlung: /api/projects
        if (rawId === undefined) {
            if (req.method === "GET") {
                return Response.json(await db.select().from(projects).orderBy(asc(projects.name)));
            }
            if (req.method === "POST") {
                const input = ProjectCreateSchema.parse(await readBody(req));
                const id = randomUUID();
                await db.insert(projects).values({id, ...input});
                return Response.json(await getProject(id), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelnes Projekt: /api/projects/:id
        const id = IdSchema.parse(rawId);

        if (req.method === "GET") {
            const project = await getProject(id);
            return project ? Response.json(project) : notFound();
        }

        if (req.method === "PATCH") {
            const patch = ProjectUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }
            if (!(await getProject(id))) return notFound();
            await db.update(projects).set(patch).where(eq(projects.id, id));
            return Response.json(await getProject(id));
        }

        if (req.method === "DELETE") {
            const [result] = await db.delete(projects).where(eq(projects.id, id));
            return result.affectedRows > 0 ? new Response(null, {status: 204}) : notFound();
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (hasDbCode(err, "ER_DUP_ENTRY")) {
            return Response.json({error: "Dieses Projekt existiert bereits"}, {status: 409});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming('projects', handler);

export const config: Config = {path: ["/api/projects", "/api/projects/:id"]};