import type {Config, Context} from "@netlify/functions";
import {z} from "zod";
import {hasDbCode} from "./lib/db-errors";
import {withTiming} from "./lib/timing";
import {UserSettingValueCreateSchema, UserSettingValueUpdateSchema} from "../../shared/user-setting";
import {IdSchema, isRoutePath, notFound, pathParams} from "./lib/id";
import {
    addSettingValue,
    changeSettingValue,
    deleteSettingValue,
    listUserSettings,
    SettingNotFoundError,
    UnknownUserError,
} from "./lib/user-settings-store";
import {forbidden} from "./lib/roles";
import {RuleError, ruleViolation} from "./lib/rule-error";
import {type Session, withSession} from "./lib/session";

// Die Regeln prüft der Store mit den Services aus shared/user-setting-rules.ts

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
        const params = pathParams(req.url, config.path);
        const userId = IdSchema.parse(params.userId);
        // Jeder User sieht und ändert nur seine eigenen Einstellungen, auch ein Administrator (Regel 10)
        if (session.user.id !== userId) return forbidden();

        // Sammlung: /api/users/:userId/settings
        if (params.id === undefined) {
            if (req.method === "GET") return Response.json(await listUserSettings(userId));

            if (req.method === "POST") {
                const input = UserSettingValueCreateSchema.parse(await readBody(req));
                return Response.json(await addSettingValue(userId, input), {status: 201});
            }
            return new Response(null, {status: 405});
        }

        // Einzelner Wert: /api/users/:userId/settings/:id
        const id = IdSchema.parse(params.id);

        if (req.method === "PATCH") {
            const patch = UserSettingValueUpdateSchema.parse(await readBody(req));
            if (Object.keys(patch).length === 0) {
                return Response.json({error: "Keine Felder zum Ändern"}, {status: 400});
            }
            return Response.json(await changeSettingValue(userId, id, patch));
        }

        if (req.method === "DELETE") {
            await deleteSettingValue(userId, id);
            return new Response(null, {status: 204});
        }

        return new Response(null, {status: 405});
    } catch (err) {
        if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
        if (err instanceof RuleError) return ruleViolation(err);
        if (err instanceof SettingNotFoundError) return notFound();
        // Zwei gleichzeitige Werte für denselben Tag: der Unique-Index greift (Regel 5)
        if (hasDbCode(err, "ER_DUP_ENTRY")) {
            return Response.json({error: "Für diesen Tag gibt es schon einen Wert"}, {status: 422});
        }
        if (err instanceof UnknownUserError || hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) {
            return Response.json({error: "User existiert nicht"}, {status: 400});
        }
        console.error(err);
        return Response.json({error: "Interner Fehler"}, {status: 500});
    }
};

export default withTiming("user-settings", withSession(handler));

export const config: Config = {path: ["/api/users/:userId/settings", "/api/users/:userId/settings/:id"]};
