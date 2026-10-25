import {useQuery} from "@tanstack/react-query";
import {fetchUserSettings} from "@/api/user-settings";

// Alle Keys beginnen mit "user-settings": ein invalidate auf ["user-settings"] trifft alle User.
// Die Berichte und das Urlaubskonto lesen dieselbe Query und rechnen nach einer Änderung neu.

/** Einstellungen und eigene Werte eines Users */
export const useUserSettings = (userId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: ["user-settings", userId],
        queryFn: () => fetchUserSettings(userId!),
        enabled: enabled && !!userId,
    });
