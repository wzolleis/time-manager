import {useQuery} from "@tanstack/react-query";
import {fetchVacations} from "@/api/vacations";

// Alle Keys beginnen mit "vacations": ein invalidate auf ["vacations"] trifft alle User

/** Urlaube eines Users */
export const useVacations = (userId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: ["vacations", userId],
        queryFn: () => fetchVacations(userId!),
        enabled: enabled && !!userId,
    });
