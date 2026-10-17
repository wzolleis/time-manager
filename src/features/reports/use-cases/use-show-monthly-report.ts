import {useMemo} from "react";
import {toBooking} from "@/api/time-entries";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useTimeEntries} from "@/views/time-entries";
import {useVacations} from "@/views/vacations";
import {monthTotals} from "@shared/time-report";
import {localDay} from "@shared/time-rules";
import {monthOf} from "@shared/week";

/** Der User sieht seinen Monatsbericht für einen Monat "JJJJ-MM" */
export function useShowMonthlyReport(month: string) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const entries = useTimeEntries(userId);
    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);

    const today = localDay(new Date(now));

    const totals = useMemo(
        () =>
            monthTotals(
                (entries.data ?? []).map(toBooking),
                month,
                vacations.data ?? [],
                holidays.data ?? [],
                today,
                new Date(now),
            ),
        [entries.data, vacations.data, holidays.data, month, today, now],
    );

    return {
        currentUser,
        currentMonth: monthOf(today),
        totals,
        futureMonth: `${month}-01` > today,
        partial: totals.targetToDateMs !== totals.targetMonthMs,
        isPending: entries.isPending || vacations.isPending || holidays.isPending,
        error: entries.error ?? vacations.error ?? holidays.error,
        retry: () => Promise.all([entries.refetch(), vacations.refetch(), holidays.refetch()]),
    };
}
