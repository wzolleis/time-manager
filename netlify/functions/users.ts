// netlify/functions/users.ts
import type {Config} from "@netlify/functions";
import {asc} from "drizzle-orm";
import {db} from "./lib/db";
import {users} from "../../db/schema";

export default async (req: Request) => {
    if (req.method !== "GET") return new Response(null, {status: 405});

    try {
        const rows = await db.select().from(users).orderBy(asc(users.name));
        return Response.json(rows);
    } catch (err) {
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export const config: Config = {path: "/api/users"};