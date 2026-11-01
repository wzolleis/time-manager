import {useMemo} from "react";
import type {Month} from "@shared/date-schemas";
import {monthTotals} from "@shared/time-report";
import {monthOf} from "@shared/week";
import {useReportData} from "@features/reports/use-report-data";

/** Der User sieht seinen Monatsbericht für einen Monat "JJJJ-MM" */
export function useShowMonthlyReport(month: Month) {
    const {currentUser, now, today, bookings, vacations, holidays, sickLeaves, soll, isPending, error, retry} =
        useReportData();

    const totals = useMemo(
        () => monthTotals(bookings, month, vacations, holidays, sickLeaves, soll, today, new Date(now)),
        [bookings, vacations, holidays, sickLeaves, soll, month, today, now],
    );

    return {
        currentUser,
        currentMonth: monthOf(today),
        totals,
        futureMonth: `${month}-01` > today,
        partial: totals.targetToDateMs !== totals.targetMonthMs,
        isPending,
        error,
        retry,
    };
}
