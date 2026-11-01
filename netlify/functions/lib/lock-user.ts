// netlify/functions/lib/lock-user.ts
import {eq} from "drizzle-orm";
import {db} from "./db";
import {users} from "../../../db/schema";
import {UnknownUserError} from "./errors";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Sperrt die Zeile des Users bis zum Ende der Transaktion und prüft, dass er existiert
 * (sonst UnknownUserError). Zwei gleichzeitige Änderungen desselben Users laufen so nacheinander
 * und sehen jeweils den aktuellen Stand.
 */
export const lockUser = async (tx: Tx, userId: string) => {
    const rows = await tx.select({id: users.id}).from(users).where(eq(users.id, userId)).for("update");
    if (rows.length === 0) throw new UnknownUserError();
};
