import type {ApiTokenValidity} from "./api-token";

const DAY_MS = 24 * 60 * 60 * 1000;

export const API_TOKEN_PREFIX = "tm_";

/** Ablauf eines Tokens, das zum Zeitpunkt createdAt erzeugt wird (null: kein Ablauf) */
export const tokenExpiry = (createdAt: Date, expiresInDays: ApiTokenValidity): Date | null =>
    expiresInDays === null ? null : new Date(createdAt.getTime() + expiresInDays * DAY_MS);

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
