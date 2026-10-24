import type {Config, Context} from "@netlify/functions";
import {z} from "zod";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {OvertimeUpdateSchema} from "../../shared/overtime";
import {IdSchema, isRoutePath, notFound, pathParams} from "./lib/id";
import {getOvertime, saveOvertime} from "./lib/overtime-store";
import {forbidden} from "./lib/roles";
import {RuleError, ruleViolation} from "./lib/rule-error";
import {type Session, withSession} from "./lib/session";

// Gespeichert wird nur die Korrektur, den Saldo berechnet der Client mit den Services aus shared/overtime-rules.ts

const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

const handler = async (req: Request, _context: Context, session: Session) => {
    try {
        if (!isRoutePath(req.url, config.path)) return notFound();
        const userId = IdSchema.parse(pathParams(req.url, config.path).userId);
        // Jeder User sieht und korrigiert nur seine eigenen Überstunden, auch ein Administrator
        if (session.user.id !== userId) return forbidden();

        // Ohne Korrektur: null
        if (req.method === "GET") return Response.json(await getOvertime(userId));

        if (req.method === "PUT") {
            const {offset} = OvertimeUpdateSchema.parse(await readBody(req));
            return Response.json(await saveOvertime(userId, offset));
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (err instanceof RuleError) return ruleViolation(err);
        if (hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "User existiert nicht"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("overtime", withSession(handler));

export const config: Config = {path: "/api/users/:userId/overtime"};
