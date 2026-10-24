// netlify/functions/lib/overtime-store.ts
// Lesen und Schreiben der Korrektur der Überstunden, gemeinsam für die REST-API und den MCP-Server
import {eq} from "drizzle-orm";
import {db} from "./db";
import {overtime} from "../../../db/schema";
import {checkOffset} from "../../../shared/overtime-rules";
import {RuleError} from "./rule-error";

/** Die Korrektur des Users, null: noch keine */
export async function getOvertime(userId: string) {
    const [row] = await db.select().from(overtime).where(eq(overtime.userId, userId)).limit(1);
    return row ?? null;
}

/** Setzt den Korrekturwert absolut: höchstens ein Eintrag je User, er wird angelegt oder überschrieben */
export async function saveOvertime(userId: string, offset: number) {
    const problem = checkOffset(offset);
    if (problem) throw new RuleError(problem);
    const created = new Date();
    await db.insert(overtime).values({userId, offset, created}).onDuplicateKeyUpdate({set: {offset, created}});
    return (await getOvertime(userId))!;
}
