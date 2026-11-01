import type {Config, Context} from "@netlify/functions";
import {errorResponse, readBody, unknownUser} from "./lib/http";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {OvertimeUpdateSchema} from "@shared/overtime";
import {IdSchema, isRoutePath, notFound, pathParams} from "./lib/id";
import {getOvertime, saveOvertime} from "./lib/overtime-store";
import {forbidden} from "./lib/roles";
import {type Session, withSession} from "./lib/session";

// Gespeichert wird nur die Korrektur, den Saldo berechnet der Client mit den Services aus shared/overtime-rules.ts

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
        if (hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) return unknownUser();
        return errorResponse(err);
    }
};

export default withTiming("overtime", withSession(handler));

export const config: Config = {path: "/api/users/:userId/overtime"};
