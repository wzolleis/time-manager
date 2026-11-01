import {useMemo} from "react";
import type {Day} from "@shared/date-schemas";
import {weekTotals} from "@shared/time-report";
import {isoWeek, weekDays} from "@shared/week";
import {useReportData} from "@features/reports/use-report-data";

/** Der User sieht seinen Wochenbericht für die Woche, in der anchor "JJJJ-MM-TT" liegt */
export function useShowWeeklyReport(anchor: Day) {
    const {currentUser, now, today, bookings, vacations, holidays, sickLeaves, soll, isPending, error, retry} =
        useReportData();

    const days = useMemo(() => weekDays(anchor), [anchor]);

    const totals = useMemo(
        () => weekTotals(bookings, days, vacations, holidays, sickLeaves, soll, today, new Date(now)),
        [bookings, vacations, holidays, sickLeaves, soll, days, today, now],
    );

    return {
        currentUser,
        today,
        ...isoWeek(anchor),
        totals,
        thisWeek: weekDays(today)[0] === days[0],
        futureWeek: days[0] > today,
        partial: totals.targetToDateMs !== totals.targetWeekMs,
        isPending,
        error,
        retry,
    };
}
