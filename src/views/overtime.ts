import {useQuery} from "@tanstack/react-query";
import {fetchOvertime} from "@/api/overtime";

// Alle Keys beginnen mit "overtime": ein invalidate auf ["overtime"] trifft alle User

/** Korrektur der Überstunden eines Users, null: noch keine */
export const useOvertime = (userId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: ["overtime", userId],
        queryFn: () => fetchOvertime(userId!),
        enabled: enabled && !!userId,
    });
