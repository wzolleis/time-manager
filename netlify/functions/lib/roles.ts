// netlify/functions/lib/roles.ts
import {and, eq} from "drizzle-orm";
import {db} from "./db";
import {endpointRoles, userRoles} from "../../../db/schema";
import {ADMIN_ROLE_ID, USER_ROLE_ID} from "../../../shared/role";
import {stripRetrySuffix} from "./id";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
// Innerhalb einer Transaktion immer tx übergeben: der Pool hat nur eine Verbindung (lib/db.ts), eine
// Abfrage über db würde auf die Verbindung der Transaktion warten und nie fertig werden
type Executor = Pick<typeof db, "select">;
type Method = (typeof endpointRoles.$inferSelect)["method"];

const METHODS: readonly string[] = endpointRoles.method.enumValues;

export const forbidden = () =>
    Response.json({error: "Dir fehlen die notwendigen Rechte für diese Aktion"}, {status: 403});

export const lastAdmin = () => Response.json({error: "Es muss mindestens ein Administrator bleiben"}, {status: 409});

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

/** Die IDs aller Rollen des Users */
export async function roleIdsOf(userId: string, ex: Executor = db): Promise<string[]> {
    const rows = await ex.select({roleId: userRoles.roleId}).from(userRoles).where(eq(userRoles.userId, userId));
    return rows.map((r) => r.roleId);
}

/**
 * Darf der User den Pfad mit der Methode aufrufen? Ja, wenn er Administrator ist oder die Rolle hat,
 * die endpoint_roles dafür verlangt.
 */
export async function hasEndpointAccess(userId: string, path: string, method: string): Promise<boolean> {
    if (!METHODS.includes(method)) return true; // HEAD, OPTIONS: der Handler antwortet ohnehin mit 405
    const roleIds = await roleIdsOf(userId);
    if (roleIds.includes(ADMIN_ROLE_ID)) return true;

    const entries = await db
        .select({path: endpointRoles.path, roleId: endpointRoles.roleId})
        .from(endpointRoles)
        .where(eq(endpointRoles.method, method as Method));
    return roleIds.includes(requiredRoleId(entries, path));
}

/** Hat der User die Rolle "Administrator"? */
export async function isAdmin(userId: string, ex: Executor = db): Promise<boolean> {
    const rows = await ex
        .select({roleId: userRoles.roleId})
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, ADMIN_ROLE_ID)))
        .limit(1);
    return rows.length > 0;
}

/**
 * Darf der angemeldete User die Daten dieses Users lesen und ändern (Buchungen, Urlaube, Krankmeldungen)?
 * Ja für sich selbst, ein Administrator für alle.
 */
export const mayAccessUser = async (sessionUserId: string, userId: string, ex: Executor = db): Promise<boolean> =>
    sessionUserId === userId || isAdmin(sessionUserId, ex);

/** Fremde Daten ohne Administrator-Rolle. Wird in der Function geworfen und im catch zu 403 (forbidden). */
export class ForbiddenError extends Error {}

/**
 * Wirft ForbiddenError, wenn der angemeldete User nicht auf die Daten dieses Users zugreifen darf.
 * In einer Transaktion mit tx als ex aufrufen.
 */
export async function ensureAccess(sessionUserId: string, userId: string, ex: Executor = db): Promise<void> {
    if (!(await mayAccessUser(sessionUserId, userId, ex))) throw new ForbiddenError();
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
