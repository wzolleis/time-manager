import {useMemo} from "react";
import type {Day} from "@shared/date-schemas";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useUserSettings} from "@/views/user-settings";
import {localDay} from "@shared/time-rules";
import type {UserSetting, UserSettingValue} from "@shared/user-setting";
import {booleanText, historyOf, isImmediate, settingStatus, type SettingStatus} from "@shared/user-setting-rules";

export type UserSettingRow = {
    key: string;
    setting: UserSetting;
    value: UserSettingValue | null; // null: der Default
    text: string; // Wert mit Einheit, z. B. "8 Stunden" oder "Default (8 Stunden)"
    validFrom: Day | null; // null: der Default, gilt ab Beginn der Zeiterfassung
    status: SettingStatus;
};

const UNITS: Record<string, [string, string]> = {hour: ["Stunde", "Stunden"], day: ["Tag", "Tage"]};

/**
 * Wert mit Einheit: "1 Stunde", "8 Stunden", "30 Tage", bei boolean "Ja" oder "Nein";
 * null: "Default (8 Stunden)" mit dem aktuellen Default
 */
export function valueText(setting: Pick<UserSetting, "type" | "unit" | "defaultValue">, value: string | null): string {
    if (value === null) return `Default (${valueText(setting, setting.defaultValue)})`;
    if (setting.type === "boolean") return booleanText(value);
    const unit = setting.unit ? UNITS[setting.unit] : undefined;
    if (!unit) return value;
    return `${value} ${Number(value) === 1 ? unit[0] : unit[1]}`;
}

/** Eine Einstellung mit Historie und ihre Zeilen: der Default und alle eigenen Werte */
export type SettingHistoryRows = {setting: UserSetting; rows: UserSettingRow[]};

/**
 * Der User sieht seine Einstellungen: die Einstellungen ohne Historie mit je einer Zeile (immediate) und je
 * Einstellung mit Historie den Default und alle eigenen Werte mit Status (histories), jeweils nach Namen.
 */
export function useShowUserSettings() {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const settings = useUserSettings(currentUser?.id);
    const today = localDay(new Date(now));

    const {immediate, histories} = useMemo(() => {
        const immediate: UserSettingRow[] = [];
        const histories: SettingHistoryRows[] = [];
        const data = settings.data;
        if (!data) return {immediate, histories};

        for (const setting of data.settings) {
            const own = data.values
                .filter((v) => v.settingId === setting.id)
                .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
            // Ohne Historie eine Zeile: der eigene Wert oder der Default, immer aktuell
            if (isImmediate(setting)) {
                const value = own.at(-1) ?? null;
                immediate.push({
                    key: value?.id ?? `${setting.id}-default`,
                    setting,
                    value,
                    text: valueText(setting, value ? value.value : setting.defaultValue),
                    validFrom: value?.validFrom ?? null,
                    status: "aktuell",
                });
                continue;
            }
            const history = historyOf(data, setting.id);
            const defaultRow: UserSettingRow = {
                key: `${setting.id}-default`,
                setting,
                value: null,
                text: valueText(setting, setting.defaultValue),
                validFrom: null,
                status: settingStatus(history, null, today),
            };
            histories.push({
                setting,
                rows: [
                    defaultRow,
                    ...own.map((value) => ({
                        key: value.id,
                        setting,
                        value,
                        text: valueText(setting, value.value),
                        validFrom: value.validFrom,
                        status: settingStatus(history, value.validFrom, today),
                    })),
                ],
            });
        }
        return {immediate, histories};
    }, [settings.data, today]);

    return {
        currentUser,
        immediate,
        histories,
        isPending: settings.isPending,
        error: settings.error,
        retry: () => settings.refetch(),
    };
}
