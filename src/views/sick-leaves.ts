import {useQuery} from "@tanstack/react-query";
import {fetchSickLeaves} from "@/api/sick-leaves";

// Alle Keys beginnen mit "sick-leaves": ein invalidate auf ["sick-leaves"] trifft alle User

/** Krankmeldungen eines Users */
export const useSickLeaves = (userId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: ["sick-leaves", userId],
        queryFn: () => fetchSickLeaves(userId!),
        enabled: enabled && !!userId,
    });
