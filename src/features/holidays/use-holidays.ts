import {useQuery} from "@tanstack/react-query";
import {fetchHolidays} from "@/api/holidays";

// Alle Feiertags-Queries beginnen mit "holidays", ein invalidate auf ["holidays"] trifft also alle

/** Feiertage, die für den User gelten: globale und eigene */
export const useHolidays = (userId: string | undefined) =>
    useQuery({
        queryKey: ["holidays", userId],
        queryFn: () => fetchHolidays(userId!),
        enabled: !!userId,
    });

/** Nur die globalen Feiertage */
export const useGlobalHolidays = (enabled = true) =>
    useQuery({
        queryKey: ["holidays", "global"],
        queryFn: () => fetchHolidays(),
        enabled,
    });
