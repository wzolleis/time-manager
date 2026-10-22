import {z} from "zod";

// Netlify wiederholt eine 403 (und eine 404) mit .html, .htm, /index.html und /index.htm
// und gibt die Antwort der letzten Wiederholung zurück
const RETRY_SUFFIX = /(\/index\.html?|\.html?)$/;

/** Der Pfad ohne die Endung, die Netlify bei der Wiederholung einer 403 oder 404 anhängt */
export const stripRetrySuffix = (path: string) => path.replace(RETRY_SUFFIX, "");

/** Eine ID, auch aus dem Pfad einer Wiederholung (/api/x/<id>.html ergibt params.id "<id>.html") */
export const IdSchema = z.preprocess((v) => (typeof v === "string" ? stripRetrySuffix(v) : v), z.string().uuid());

/**
 * Gültig sind nur /api/<name> und /api/<name>/<id>, jede andere Variante bekommt eine 410 ohne
 * Datenbankzugriff. Die Wiederholungen von Netlify (/api/<name>.html usw.) zählen wie das Original:
 * wirft der Handler selbst eine 403 (ensureAccess), beantwortet er auch jede Wiederholung mit 403,
 * sonst käme beim Aufrufer am Ende eine 410 an. Eine 404 wiederholt Netlify nie, weil "nicht gefunden"
 * immer 410 ist (notFound).
 * Der interne Function-Pfad /.netlify/functions/<name> bleibt erlaubt.
 */
export const isApiPath = (url: string, name: string): boolean =>
    new RegExp(`^(/api|/\\.netlify/functions)/${name}(/[^/.]+)?/?$`).test(stripRetrySuffix(new URL(url).pathname));

// Die Parameter des ersten passenden Musters, ohne passendes Muster null. valid prüft jedes Segment eines Parameters.
function matchRoute(
    url: string,
    patterns: string | string[] | undefined,
    valid: (segment: string) => boolean,
): Record<string, string> | null {
    const path = stripRetrySuffix(new URL(url).pathname)
        .replace(/^\/\.netlify\/functions\//, "/api/")
        .replace(/\/+$/, "");
    const have = path.split("/");
    for (const pattern of [patterns ?? []].flat()) {
        const want = pattern.split("/");
        if (want.length !== have.length) continue;
        const params: Record<string, string> = {};
        const matches = want.every((seg, i) => {
            if (!seg.startsWith(":")) return seg === have[i];
            params[seg.slice(1)] = decodeURIComponent(have[i]);
            return valid(have[i]);
        });
        if (matches) return params;
    }
    return null;
}

/**
 * Die Parameter der Route (":id", ":action") aus der URL, gegen die Pfade aus config.path.
 * Statt context.params, weil netlify dev in den Wiederholungen einer 403 (…/<id>/index.html) keine
 * params mitgibt; der Handler nähme dann den Zweig für die Sammlung. Ohne passenden Pfad: {}.
 */
export const pathParams = (url: string, patterns: string | string[] | undefined): Record<string, string> =>
    matchRoute(url, patterns, (seg) => seg !== "") ?? {};

/**
 * Wie isApiPath, aber gegen die Muster aus config.path, für Pfade mit mehreren Parametern
 * (/api/users/:userId/vacations/:id). Ein Parameter ist ein Segment ohne Punkt, die Wiederholungen
 * von Netlify zählen wie das Original. Jeder andere Pfad bekommt eine 410 ohne Datenbankzugriff.
 */
export const isRoutePath = (url: string, patterns: string | string[] | undefined): boolean =>
    matchRoute(url, patterns, (seg) => /^[^/.]+$/.test(seg)) !== null;

/**
 * "Nicht gefunden" bewusst mit 410 statt 404: Netlify wiederholt eine 404-Antwort mit
 * .html, .htm und /index.html und fällt am Ende auf die App (index.html, Status 200) zurück,
 * dadurch ginge die 404 verloren. Bei anderen Statuscodes passiert das nicht.
 */
export const notFound = () => Response.json({error: "Nicht gefunden"}, {status: 410});
