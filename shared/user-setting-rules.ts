// shared/user-setting-rules.ts
// Regeln der Einstellungen (features/use-case/user-settings.md, Regeln 1 bis 7)
import {isValidDay} from "./day-range";
import {
    DEFAULT_SOLL_HOURS,
    DEFAULT_VACATION_DAYS,
    SOLL_SETTING_ID,
    type UserSetting,
    type UserSettingsData,
    VACATION_DAYS_SETTING_ID,
} from "./user-setting";

// Wie germanDay aus vacation-rules.ts, ohne Import: vacation-rules.ts verwendet valueOn
const germanDay = (day: string): string => day.split("-").reverse().join(".");

export type SettingPoint = {id: string; validFrom: string; value: number};

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

/** Die History aus den Daten der API. Ohne geladene Einstellung gilt der Default aus shared/user-setting.ts. */
export function historyOf(data: UserSettingsData | undefined, settingId: string): SettingHistory {
    const setting = data?.settings.find((s) => s.id === settingId);
    const values = (data?.values ?? [])
        .filter((v) => v.settingId === settingId)
        .map((v) => ({id: v.id, validFrom: v.validFrom, value: Number(v.value)}));
    return {defaultValue: setting ? Number(setting.defaultValue) : (FALLBACK[settingId] ?? 0), values};
}

/** Nur der Default, z. B. für Tests: Soll 8 Stunden, 30 Urlaubstage */
export const defaultHistory = (defaultValue: number): SettingHistory => ({defaultValue, values: []});

/** Der eigene Wert, der an day gilt (Regel 1), null: es gilt der Default */
export function pointOn(history: SettingHistory, day: string): SettingPoint | null {
    let best: SettingPoint | null = null;
    // ISO-Daten lassen sich als Text vergleichen
    for (const p of history.values) if (p.validFrom <= day && (!best || p.validFrom > best.validFrom)) best = p;
    return best;
}

/** Der Wert, der an day "JJJJ-MM-TT" gilt (Regel 1) */
export const valueOn = (history: SettingHistory, day: string): number =>
    pointOn(history, day)?.value ?? history.defaultValue;

/** Status eines eigenen Werts (validFrom) oder des Defaults (null) am Tag today (Regel 2) */
export function settingStatus(history: SettingHistory, validFrom: string | null, today: string): SettingStatus {
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
    candidate: {value: string; validFrom: string},
    today: string,
): string | null {
    const {value, validFrom} = candidate;
    if (!isValidDay(validFrom)) return "Ungültiges Datum";

    if (setting.type === "number") {
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
        return `Für ${setting.name} gibt es ab dem ${germanDay(validFrom)} schon einen Wert`;
    }
    return null;
}

/** null = erlaubt. Ändern lassen sich nur geplante Werte (Regel 7). */
export const checkChange = (history: SettingHistory, validFrom: string, today: string): string | null =>
    settingStatus(history, validFrom, today) === "geplant"
        ? null
        : "Nur geplante Werte lassen sich ändern. Für einen neuen Wert bitte einen neuen Eintrag anlegen.";

/** null = erlaubt. Löschen lassen sich nur geplante Werte (Regel 7). */
export const checkDelete = (history: SettingHistory, validFrom: string, today: string): string | null =>
    settingStatus(history, validFrom, today) === "geplant"
        ? null
        : "Nur geplante Werte lassen sich löschen, abgelaufene gelten für die Vergangenheit weiter";
