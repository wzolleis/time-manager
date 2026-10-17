import {useQuery} from "@tanstack/react-query";
import {fetchTimeEntries} from "@/api/time-entries";

// Alle Keys beginnen mit "time-entries": ein invalidate auf ["time-entries"] trifft alle User

/** Buchungen eines Users */
export const useTimeEntries = (userId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: ["time-entries", userId],
        queryFn: () => fetchTimeEntries(userId!),
        enabled: enabled && !!userId,
    });
