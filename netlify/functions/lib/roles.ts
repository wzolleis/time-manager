// netlify/functions/lib/roles.ts
import {eq} from "drizzle-orm";
import {db} from "./db";
import {endpointRoles, userRoles} from "../../../db/schema";
import {ADMIN_ROLE_ID, USER_ROLE_ID} from "../../../shared/role";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Method = (typeof endpointRoles.$inferSelect)["method"];

const METHODS: readonly string[] = endpointRoles.method.enumValues;

export const forbidden = () =>
    Response.json({error: "Dir fehlen die notwendigen Rechte für diese Aktion"}, {status: 403});

export const lastAdmin = () => Response.json({error: "Es muss mindestens ein Administrator bleiben"}, {status: 409});

// Netlify wiederholt eine 403 (wie eine 404) mit .html, .htm, /index.html und /index.htm
// und gibt die Antwort der letzten Wiederholung zurück
const RETRY_SUFFIX = /(\/index\.html?|\.html?)$/;

/** Der Pfad ohne die Endung, die Netlify bei der Wiederholung einer 403 oder 404 anhängt */
export const stripRetrySuffix = (path: string) => path.replace(RETRY_SUFFIX, "");

/**
 * Der Pfad, gegen den die Muster aus endpoint_roles geprüft werden. Die Wiederholungen von Netlify
 * (/api/users.html usw.) ergeben denselben Pfad wie das Original, damit auch sie mit 403 beantwortet
 * werden; sonst käme beim Aufrufer am Ende die 410 aus der Pfadprüfung der Function an.
 * Der interne Pfad /.netlify/functions/<name> wird auf /api/<name> abgebildet.
 */
export const endpointPath = (url: string) =>
    stripRetrySuffix(new URL(url).pathname)
        .replace(/^\/\.netlify\/functions\//, "/api/")
        .replace(/\/+$/, "");

/** Passt der konkrete Pfad zum Muster? ":name" steht für genau ein beliebiges Segment. */
export function matchesPattern(pattern: string, path: string): boolean {
    const want = pattern.split("/");
    const have = path.split("/");
    return (
        want.length === have.length && want.every((seg, i) => (seg.startsWith(":") ? have[i] !== "" : seg === have[i]))
    );
}

/**
 * Die Rolle, die der Pfad verlangt: der passende Eintrag aus endpoint_roles, bei mehreren der
 * genaueste (mit den wenigsten Parametern), ohne Eintrag die Rolle "User".
 * Der Vergleich läuft über den Pfad statt über context.params, denn bei den Wiederholungen
 * von Netlify sind die Parameter leer.
 */
export function requiredRoleId(entries: {path: string; roleId: string}[], path: string): string {
    const params = (pattern: string) => pattern.split("/").filter((seg) => seg.startsWith(":")).length;
    const match = entries
        .filter((e) => matchesPattern(e.path, path))
        .sort((a, b) => params(a.path) - params(b.path))[0];
    return match?.roleId ?? USER_ROLE_ID;
}

/**
 * Darf der User den Pfad mit der Methode aufrufen? Ja, wenn er Administrator ist oder die Rolle hat,
 * die endpoint_roles dafür verlangt.
 */
export async function hasEndpointAccess(userId: string, path: string, method: string): Promise<boolean> {
    if (!METHODS.includes(method)) return true; // HEAD, OPTIONS: der Handler antwortet ohnehin mit 405
    const roleIds = (
        await db.select({roleId: userRoles.roleId}).from(userRoles).where(eq(userRoles.userId, userId))
    ).map((r) => r.roleId);
    if (roleIds.includes(ADMIN_ROLE_ID)) return true;

    const entries = await db
        .select({path: endpointRoles.path, roleId: endpointRoles.roleId})
        .from(endpointRoles)
        .where(eq(endpointRoles.method, method as Method));
    return roleIds.includes(requiredRoleId(entries, path));
}

/**
 * Sperrt alle Administrator-Zuordnungen bis zum Ende der Transaktion und liefert die User-IDs.
 * Wer danach den letzten Administrator entfernen will, sieht den aktuellen Stand und nicht
 * einen veralteten: zwei gleichzeitige Änderungen können so nicht beide durchgehen.
 */
export async function lockAdmins(tx: Tx): Promise<string[]> {
    const rows = await tx
        .select({userId: userRoles.userId})
        .from(userRoles)
        .where(eq(userRoles.roleId, ADMIN_ROLE_ID))
        .for("update");
    return rows.map((r) => r.userId);
}
