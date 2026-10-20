import {useMemo} from "react";
import {toBooking} from "@/api/time-entries";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {useVacations} from "@/views/vacations";
import {yearTotals} from "@shared/time-report";
import {firstBookingDay, localDay} from "@shared/time-rules";

/** Der User sieht seinen Jahresbericht für ein Jahr "JJJJ" */
export function useShowYearlyReport(year: string) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const entries = useTimeEntries(userId);
    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);
    const sickLeaves = useSickLeaves(userId);

    const today = localDay(new Date(now));
    const currentYear = today.slice(0, 4);
    const bookings = useMemo(() => (entries.data ?? []).map(toBooking), [entries.data]);

    const totals = useMemo(
        () =>
            yearTotals(
                bookings,
                year,
                vacations.data ?? [],
                holidays.data ?? [],
                sickLeaves.data ?? [],
                today,
                new Date(now),
            ),
        [bookings, vacations.data, holidays.data, sickLeaves.data, year, today, now],
    );

    return {
        currentUser,
        currentYear,
        // Frühestes Jahr: das der ersten Buchung, ohne Buchungen das laufende
        firstYear: firstBookingDay(bookings)?.slice(0, 4) ?? currentYear,
        totals,
        futureYear: `${year}-01-01` > today,
        partial: totals.targetToDateMs !== totals.targetYearMs,
        isPending: entries.isPending || vacations.isPending || holidays.isPending || sickLeaves.isPending,
        error: entries.error ?? vacations.error ?? holidays.error ?? sickLeaves.error,
        retry: () => Promise.all([entries.refetch(), vacations.refetch(), holidays.refetch(), sickLeaves.refetch()]),
    };
}
