// netlify/functions/lib/http.ts
// Gemeinsame Bausteine der Functions: Body lesen und Fehler in eine Antwort umwandeln
import {z} from "zod";
import {NotFoundError, UnknownUserError} from "./errors";
import {notFound} from "./id";
import {forbidden, ForbiddenError} from "./roles";
import {RuleError, ruleViolation} from "./rule-error";

/** Der JSON-Body der Anfrage, undefined ohne gültiges JSON. Das Schema meldet dann den Fehler. */
export const readBody = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return undefined;
    }
};

export const unknownUser = () => Response.json({error: "User existiert nicht"}, {status: 400});

/**
 * Die Antwort auf einen Fehler im Handler. Fehlercodes der Datenbank mit eigener Meldung
 * (z. B. ER_DUP_ENTRY) prüft die Function vorher selbst.
 */
export function errorResponse(err: unknown): Response {
    if (err instanceof z.ZodError) return Response.json({errors: err.issues}, {status: 400});
    if (err instanceof RuleError) return ruleViolation(err);
    if (err instanceof ForbiddenError) return forbidden();
    if (err instanceof NotFoundError) return notFound();
    if (err instanceof UnknownUserError) return unknownUser();
    console.error(err);
    return Response.json({error: "Interner Fehler"}, {status: 500});
}
