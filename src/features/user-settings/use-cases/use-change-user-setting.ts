import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateUserSettingValue} from "@/api/user-settings";
import {useCurrentUser} from "@/lib/user-context";
import {useUserSettings} from "@/views/user-settings";
import {localDay} from "@shared/time-rules";
import type {UserSetting, UserSettingValue, UserSettingValueUpdate} from "@shared/user-setting";
import {checkChange, checkSettingValue, historyOf} from "@shared/user-setting-rules";

type Change = {setting: UserSetting; current: UserSettingValue; value: string; validFrom: string};

/** Der User ändert einen geplanten Wert */
export function useChangeUserSetting() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const settings = useUserSettings(currentUser?.id);

    const save = useMutation({
        mutationFn: async ({current, value, validFrom}: Change) => {
            // Nur Geändertes senden
            const patch: UserSettingValueUpdate = {};
            if (value !== current.value) patch.value = value;
            if (validFrom !== current.validFrom) patch.validFrom = validFrom;
            if (Object.keys(patch).length === 0) return;
            await updateUserSettingValue(current.userId, current.id, patch);
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ["user-settings"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung
        problem: ({setting, current, value, validFrom}: Change) => {
            const history = historyOf(settings.data, setting.id);
            const today = localDay(new Date());
            return (
                checkChange(history, current.validFrom, today) ??
                checkSettingValue(
                    setting,
                    history.values.filter((p) => p.id !== current.id),
                    {value, validFrom},
                    today,
                )
            );
        },
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
