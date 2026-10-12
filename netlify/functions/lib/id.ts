import {z} from "zod";

export const IdSchema = z.string().uuid();

/**
 * Netlify wiederholt eine 404-Antwort mit .html, .htm und /index.html (Suche nach einer
 * statischen Datei). Gültig sind nur /api/<name> und /api/<name>/<id>, jede andere
 * Variante bekommt eine 404 ohne Datenbankzugriff.
 * Der interne Function-Pfad /.netlify/functions/<name> bleibt erlaubt.
 */
export const isApiPath = (url: string, name: string): boolean =>
    new RegExp(`^(/api|/\\.netlify/functions)/${name}(/[^/.]+)?/?$`).test(new URL(url).pathname);


/**
 * "Nicht gefunden" bewusst mit 410 statt 404: Netlify wiederholt eine 404-Antwort mit
 * .html, .htm und /index.html und fällt am Ende auf die App (index.html, Status 200) zurück,
 * dadurch ginge die 404 verloren. Bei anderen Statuscodes passiert das nicht.
 */
export const notFound = () => Response.json({error: "Nicht gefunden"}, {status: 410});