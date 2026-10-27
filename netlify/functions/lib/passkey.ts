// netlify/functions/lib/passkey.ts
import {and, eq, gt, isNull, lt} from "drizzle-orm";
import {db} from "./db";
import {passkeyChallenges} from "../../../db/schema";

export const RP_NAME = "Time Manager";
// So lange gilt eine Challenge zwischen Optionen und Prüfung
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type RelyingParty = {rpID: string; origin: string};
export type ChallengePurpose = "registration" | "authentication";

/**
 * Domain (RP-ID) und Origin, an die ein Passkey gebunden ist. In der Produktion aus PASSKEY_RP_ID und
 * PASSKEY_ORIGIN, damit kein Passkey an eine Deploy-Preview gebunden wird, sonst aus der URL der Anfrage.
 */
export function relyingParty(url: string, env: Record<string, string | undefined> = process.env): RelyingParty {
    const {hostname, origin} = new URL(url);
    return {rpID: env.PASSKEY_RP_ID || hostname, origin: env.PASSKEY_ORIGIN || origin};
}

/** Merkt sich eine ausgegebene Challenge. Beim Eintragen gehört sie zum angemeldeten User. */
export async function saveChallenge(challenge: string, purpose: ChallengePurpose, userId: string | null) {
    const now = new Date();
    // Abgelaufene Challenges bei der Gelegenheit aufräumen, wie bei den Sessions
    await db.delete(passkeyChallenges).where(lt(passkeyChallenges.expiresAt, now));
    await db.insert(passkeyChallenges).values({
        challenge,
        purpose,
        userId,
        expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    });
}

/**
 * Löscht die Challenge und sagt, ob sie gültig war: ausgegeben, nicht abgelaufen, für diesen Zweck und
 * diesen User. Weil gelöscht wird, gilt jede Challenge nur einmal.
 */
export async function consumeChallenge(
    challenge: string,
    purpose: ChallengePurpose,
    userId: string | null,
): Promise<boolean> {
    const [result] = await db
        .delete(passkeyChallenges)
        .where(
            and(
                eq(passkeyChallenges.challenge, challenge),
                eq(passkeyChallenges.purpose, purpose),
                userId === null ? isNull(passkeyChallenges.userId) : eq(passkeyChallenges.userId, userId),
                gt(passkeyChallenges.expiresAt, new Date()),
            ),
        );
    return result.affectedRows === 1;
}
