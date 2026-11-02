import {useMutation, useQueryClient} from "@tanstack/react-query";
import {parseDay} from "@shared/date-schemas";
import {createUserSettingValue} from "@/api/user-settings";
import {useCurrentUser} from "@/lib/user-context";
import {useUserSettings} from "@/views/user-settings";
import {localDay} from "@shared/time-rules";
import type {UserSetting} from "@shared/user-setting";
import {checkSettingValue, historyOf} from "@shared/user-setting-rules";

// value null: „Default“; validFrom fehlt bei Einstellungen ohne Historie, deren Wert sofort gilt
type Addition = {setting: UserSetting; value: string | null; validFrom?: string};

/**
 * Der User trägt einen neuen Wert zu einer Einstellung ein. Der bisherige Wert bleibt bis dahin gültig, bei einer
 * Einstellung ohne Historie wird er sofort ersetzt.
 */
export function useAddUserSetting() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const settings = useUserSettings(currentUser?.id); // für die Prüfung gegen die vorhandenen Werte

    const save = useMutation({
        mutationFn: ({setting, value, validFrom}: Addition) =>
            createUserSettingValue(currentUser!.id, {
                settingId: setting.id,
                value,
                validFrom: validFrom === undefined ? undefined : parseDay(validFrom),
            }),
        // Berichte und Urlaubskonto lesen dieselbe Query und rechnen damit neu
        onSuccess: () => qc.invalidateQueries({queryKey: ["user-settings"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung
        problem: ({setting, value, validFrom}: Addition) =>
            checkSettingValue(
                setting,
                historyOf(settings.data, setting.id).values,
                {value, validFrom},
                localDay(new Date()),
            ),
        // Ohne eigenen Wert darf der erste auch rückwirkend gelten (Regel 3)
        hasOwnValue: (setting: UserSetting) => historyOf(settings.data, setting.id).values.length > 0,
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
