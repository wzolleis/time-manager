import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useUserSettings} from "@/views/user-settings";
import {localDay} from "@shared/time-rules";
import type {UserSetting, UserSettingValue} from "@shared/user-setting";
import {historyOf, settingStatus, type SettingStatus} from "@shared/user-setting-rules";

export type UserSettingRow = {
    key: string;
    setting: UserSetting;
    value: UserSettingValue | null; // null: der Default
    text: string; // Wert mit Einheit, z. B. "8 Stunden"
    validFrom: string | null; // null: der Default, gilt ab Beginn der Zeiterfassung
    status: SettingStatus;
};

const UNITS: Record<string, [string, string]> = {hour: ["Stunde", "Stunden"], day: ["Tag", "Tage"]};

/** Wert mit Einheit: "1 Stunde", "8 Stunden", "30 Tage" */
export function valueText(setting: Pick<UserSetting, "unit">, value: string): string {
    const unit = setting.unit ? UNITS[setting.unit] : undefined;
    if (!unit) return value;
    return `${value} ${Number(value) === 1 ? unit[0] : unit[1]}`;
}

/** Der User sieht seine Einstellungen: je Einstellung den Default und alle eigenen Werte mit Status */
export function useShowUserSettings() {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const settings = useUserSettings(currentUser?.id);
    const today = localDay(new Date(now));

    const rows = useMemo<UserSettingRow[]>(() => {
        const data = settings.data;
        if (!data) return [];
        return data.settings.flatMap((setting) => {
            const history = historyOf(data, setting.id);
            const own = data.values
                .filter((v) => v.settingId === setting.id)
                .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
            const defaultRow: UserSettingRow = {
                key: `${setting.id}-default`,
                setting,
                value: null,
                text: valueText(setting, setting.defaultValue),
                validFrom: null,
                status: settingStatus(history, null, today),
            };
            return [
                defaultRow,
                ...own.map((value) => ({
                    key: value.id,
                    setting,
                    value,
                    text: valueText(setting, value.value),
                    validFrom: value.validFrom,
                    status: settingStatus(history, value.validFrom, today),
                })),
            ];
        });
    }, [settings.data, today]);

    return {
        currentUser,
        rows,
        isPending: settings.isPending,
        error: settings.error,
        retry: () => settings.refetch(),
    };
}
