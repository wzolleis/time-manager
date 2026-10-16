import {useMemo} from "react";
import {useCurrentUser} from "@/lib/user-context";
import {useGlobalHolidays, useHolidays} from "@/views/holidays";
import type {Holiday} from "@shared/holiday";

export type HolidayScope = "global" | "user";
export type HolidayRow = Holiday & {editable: boolean; userName?: string};

/**
 * scope "global": Der Administrator sieht die Feiertage für alle und darf jeden ändern.
 * scope "user": Der User sieht die globalen und seine eigenen Feiertage, ändern darf er nur die eigenen.
 */
export function useShowHolidays(scope: HolidayScope, year: number) {
    const {currentUser} = useCurrentUser();

    // Beide Views immer aufrufen (Hook-Regeln), es läuft nur die passende Query
    const userHolidays = useHolidays(scope === "user" ? currentUser?.id : undefined);
    const globalHolidays = useGlobalHolidays(scope === "global");
    const holidays = scope === "user" ? userHolidays : globalHolidays;

    const rows = useMemo<HolidayRow[] | undefined>(
        () =>
            holidays.data
                ?.filter((h) => h.date.startsWith(`${year}-`))
                .map((h) => ({
                    ...h,
                    editable: scope === "global" || h.userId !== null,
                    userName: currentUser?.name,
                })),
        [holidays.data, year, scope, currentUser?.name],
    );

    return {
        rows,
        isPending: holidays.isPending,
        error: holidays.error,
        retry: () => holidays.refetch(),
    };
}
