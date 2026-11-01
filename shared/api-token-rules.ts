import {Temporal} from "temporal-polyfill";
import type {ApiTokenValidity} from "./api-token";
import {TZ} from "./day-range";

export const API_TOKEN_PREFIX = "tm_";

/**
 * Ablauf eines Tokens, das zum Zeitpunkt createdAt erzeugt wird (null: kein Ablauf). Gezählt werden Kalendertage
 * in TZ: das Token läuft zur selben lokalen Uhrzeit ab, zu der es erzeugt wurde, auch über eine Zeitumstellung.
 */
export function tokenExpiry(createdAt: Date, expiresInDays: ApiTokenValidity): Date | null {
    if (expiresInDays === null) return null;
    const expiry = Temporal.Instant.fromEpochMilliseconds(createdAt.getTime())
        .toZonedDateTimeISO(TZ)
        .add({days: expiresInDays});
    return new Date(expiry.epochMilliseconds);
}

/** Ist das Token zum Zeitpunkt now abgelaufen? Ohne Ablauf nie. */
export const isTokenExpired = (expiresAt: Date | string | null, now: Date): boolean =>
    expiresAt !== null && new Date(expiresAt).getTime() <= now.getTime();

/** Name der Gültigkeit für die Auswahl */
export const validityLabel = (expiresInDays: ApiTokenValidity): string =>
    expiresInDays === null ? "kein Ablauf" : expiresInDays === 365 ? "1 Jahr" : `${expiresInDays} Tage`;

/** null = gültig, sonst eine Fehlermeldung */
export const checkTokenName = (name: string): string | null =>
    name.trim().length === 0
        ? "Bitte einen Namen angeben"
        : name.trim().length > 100
          ? "Der Name darf höchstens 100 Zeichen lang sein"
          : null;
