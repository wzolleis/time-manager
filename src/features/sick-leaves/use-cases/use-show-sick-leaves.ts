import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import type {SickLeave} from "@shared/sick-leave";
import {sickDaysInYear} from "@shared/sick-leave-rules";
import {localDay} from "@shared/time-rules";
import {countWorkdays, dayCount} from "@shared/vacation-rules";

export type SickLeaveRow = SickLeave & {days: number; sickDays: number};

/** Der User sieht seine Krankmeldungen eines Jahres */
export function useShowSickLeaves(year: number) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const sickLeaves = useSickLeaves(userId);
    const holidays = useHolidays(userId);

    const today = localDay(new Date(now));

    // Nur Krankmeldungen, die zumindest teilweise im gewählten Jahr liegen
    const rows = useMemo<SickLeaveRow[]>(
        () =>
            (sickLeaves.data ?? [])
                .filter((s) => s.startDate <= `${year}-12-31` && s.endDate >= `${year}-01-01`)
                .map((s) => ({
                    ...s,
                    days: dayCount(s.startDate, s.endDate),
                    sickDays: countWorkdays(s.startDate, s.endDate, holidays.data ?? []), // ganzer Zeitraum
                })),
        [sickLeaves.data, holidays.data, year],
    );
    const total = useMemo(
        () => sickDaysInYear(sickLeaves.data ?? [], year, holidays.data ?? []),
        [sickLeaves.data, holidays.data, year],
    );

    return {
        currentUser,
        currentYear: Number(today.slice(0, 4)),
        rows,
        total,
        isPending: sickLeaves.isPending || holidays.isPending,
        error: sickLeaves.error ?? holidays.error,
        retry: () => Promise.all([sickLeaves.refetch(), holidays.refetch()]),
    };
}
