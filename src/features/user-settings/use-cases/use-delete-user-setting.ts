import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteUserSettingValue} from "@/api/user-settings";
import type {UserSettingValue} from "@shared/user-setting";

/** Der User löscht einen geplanten Wert. Bis zum nächsten Wert gilt dann wieder der vorherige. */
export function useDeleteUserSetting() {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: ({userId, id}: Pick<UserSettingValue, "userId" | "id">) => deleteUserSettingValue(userId, id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["user-settings"]}),
    });

    return {
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
