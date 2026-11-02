// shared/user-setting-rules.ts
// Regeln der Einstellungen (features/use-case/user-settings.md, Regeln 1 bis 7 und Einstellungen ohne Historie)
import type {Day} from "./date-schemas";
import {formatDay} from "./format";
import {addDays, isValidDay} from "./day-range";
import {
    DEFAULT_SHOW_ACTION_BAR,
    DEFAULT_SOLL_HOURS,
    DEFAULT_VACATION_DAYS,
    SHOW_ACTION_BAR_SETTING_ID,
    SOLL_SETTING_ID,
    type UserSetting,
    type UserSettingsData,
    type UserSettingValue,
    VACATION_DAYS_SETTING_ID,
} from "./user-setting";

/** Ein eigener Wert. value null: ab validFrom gilt wieder der Default */
export type SettingPoint = {id: string; validFrom: Day; value: number | null};

/** Default und eigene Werte einer Einstellung, für die Berechnungen */
export type SettingHistory = {defaultValue: number; values: SettingPoint[]};

export type SettingStatus = "aktuell" | "geplant" | "abgelaufen";

/** Grenzen der Werte (Regel 6), nur ganze Zahlen */
const LIMITS: Record<string, {min: number; max?: number}> = {
    [SOLL_SETTING_ID]: {min: 1, max: 10},
    [VACATION_DAYS_SETTING_ID]: {min: 0},
};

const FALLBACK: Record<string, number> = {
    [SOLL_SETTING_ID]: DEFAULT_SOLL_HOURS,
    [VACATION_DAYS_SETTING_ID]: DEFAULT_VACATION_DAYS,
};

const BOOLEAN_FALLBACK: Record<string, boolean> = {[SHOW_ACTION_BAR_SETTING_ID]: DEFAULT_SHOW_ACTION_BAR};

/** Die Einstellung hat keine Historie: ein eigener Wert je User, er gilt sofort und wird überschrieben */
export const isImmediate = (setting: Pick<UserSetting, "validFromUnit">) => setting.validFromUnit === "immediately";

/** Text eines Werts vom Typ boolean */
export const booleanText = (value: string) => (value === "true" ? "Ja" : "Nein");

/**
 * Der Wert einer Einstellung vom Typ boolean, der jetzt gilt: der eigene Wert oder der Default. Ohne geladene
 * Einstellung gilt der Default aus shared/user-setting.ts.
 */
export function booleanSettingOf(data: UserSettingsData | undefined, settingId: string): boolean {
    const own = (data?.values ?? [])
        .filter((v) => v.settingId === settingId)
        .reduce<UserSettingValue | null>((a, b) => (a && a.validFrom > b.validFrom ? a : b), null);
    const setting = data?.settings.find((s) => s.id === settingId);
    const text = own?.value ?? setting?.defaultValue;
    return text === undefined ? (BOOLEAN_FALLBACK[settingId] ?? false) : text === "true";
}

/**
 * Die History aus den Daten der API, für die Berechnungen mit Zahlen. Bei boolean ist value NaN, es zählt dort nur,
 * ob ein eigener Wert „Default“ (null) ist. Ohne geladene Einstellung gilt der Default aus shared/user-setting.ts.
 */
export function historyOf(data: UserSettingsData | undefined, settingId: string): SettingHistory {
    const setting = data?.settings.find((s) => s.id === settingId);
    const values = (data?.values ?? [])
        .filter((v) => v.settingId === settingId)
        .map((v) => ({id: v.id, validFrom: v.validFrom, value: v.value === null ? null : Number(v.value)}));
    return {defaultValue: setting ? Number(setting.defaultValue) : (FALLBACK[settingId] ?? 0), values};
}

/** Nur der Default, z. B. für Tests: Soll 8 Stunden, 30 Urlaubstage */
export const defaultHistory = (defaultValue: number): SettingHistory => ({defaultValue, values: []});

/** Der eigene Wert, der an day gilt (Regel 1), null: es gilt der Default */
export function pointOn(history: SettingHistory, day: Day): SettingPoint | null {
    let best: SettingPoint | null = null;
    // ISO-Daten lassen sich als Text vergleichen
    for (const p of history.values) if (p.validFrom <= day && (!best || p.validFrom > best.validFrom)) best = p;
    return best;
}

/** Der Wert, der an day "JJJJ-MM-TT" gilt (Regel 1). Ein Wert „Default“ (null) liefert den Default. */
export const valueOn = (history: SettingHistory, day: Day): number =>
    pointOn(history, day)?.value ?? history.defaultValue;

/** Status eines eigenen Werts (validFrom) oder des Defaults (null) am Tag today (Regel 2) */
export function settingStatus(history: SettingHistory, validFrom: Day | null, today: Day): SettingStatus {
    if (validFrom !== null && validFrom > today) return "geplant";
    const current = pointOn(history, today);
    if (validFrom === null) return current ? "abgelaufen" : "aktuell";
    return current?.validFrom === validFrom ? "aktuell" : "abgelaufen";
}

/**
 * null = erlaubt, sonst eine verständliche Fehlermeldung. Prüft einen neuen oder geänderten Wert gegen die
 * anderen Werte derselben Einstellung (Regeln 3 bis 6). others enthält den geänderten Wert nicht.
 */
export function checkSettingValue(
    setting: Pick<UserSetting, "id" | "name" | "type" | "validFromUnit">,
    others: SettingPoint[],
    candidate: {value: string | null; validFrom?: string},
    today: Day,
): string | null {
    const {value, validFrom} = candidate;

    if (value !== null && setting.type === "boolean" && !["true", "false"].includes(value.trim())) {
        return `${setting.name}: bitte true oder false angeben`;
    }

    // Ohne Historie gilt der neue Wert sofort, die Regeln 3 bis 5 entfallen
    if (isImmediate(setting)) {
        if (value === null && others.every((p) => p.value === null))
            return `${setting.name}: es gilt schon der Default`;
        return null;
    }

    if (!validFrom) return "Bitte „gültig ab“ angeben";
    if (!isValidDay(validFrom)) return "Ungültiges Datum";

    if (value !== null && setting.type === "number") {
        if (!/^\d+$/.test(value.trim())) return `${setting.name}: bitte eine ganze Zahl eingeben`;
        const n = Number(value);
        const limit = LIMITS[setting.id];
        if (limit && (n < limit.min || (limit.max !== undefined && n > limit.max))) {
            return limit.max === undefined
                ? `${setting.name} muss mindestens ${limit.min} sein`
                : `${setting.name} muss zwischen ${limit.min} und ${limit.max} liegen`;
        }
    }

    if (setting.validFromUnit === "year" && !validFrom.endsWith("-01-01")) {
        return `${setting.name} gelten immer ab dem 1. Januar eines Jahres`;
    }

    // Rückwirkend nur der erste eigene Wert, z. B. beim ersten Einrichten
    if (validFrom <= today && others.length > 0) {
        return "„gültig ab“ muss in der Zukunft liegen, rückwirkend geht nur der erste eigene Wert";
    }

    if (others.some((p) => p.validFrom === validFrom)) {
        return `Für ${setting.name} gibt es ab dem ${formatDay(validFrom)} schon einen Wert`;
    }

    // Zurücksetzen nur, wenn am Tag davor ein eigener Wert gilt, sonst gilt dort schon der Default
    if (value === null && pointOn({defaultValue: 0, values: others}, addDays(validFrom, -1))?.value == null) {
        return `${setting.name}: ab dem ${formatDay(validFrom)} gilt schon der Default`;
    }
    return null;
}

/** null = erlaubt. Ohne Historie gibt es keine geplanten Werte, ein neuer Wert ersetzt den bisherigen. */
export const checkImmediateEdit = (setting: Pick<UserSetting, "name" | "validFromUnit">): string | null =>
    isImmediate(setting) ? `${setting.name}: bitte einen neuen Wert eintragen` : null;

/** null = erlaubt. Ändern lassen sich nur geplante Werte (Regel 7). */
export const checkChange = (history: SettingHistory, validFrom: Day, today: Day): string | null =>
    settingStatus(history, validFrom, today) === "geplant"
        ? null
        : "Nur geplante Werte lassen sich ändern. Für einen neuen Wert bitte einen neuen Eintrag anlegen.";

/** null = erlaubt. Löschen lassen sich nur geplante Werte (Regel 7). */
export const checkDelete = (history: SettingHistory, validFrom: Day, today: Day): string | null =>
    settingStatus(history, validFrom, today) === "geplant"
        ? null
        : "Nur geplante Werte lassen sich löschen, abgelaufene gelten für die Vergangenheit weiter";
