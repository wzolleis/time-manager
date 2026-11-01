import {useMemo} from "react";
import type {Year} from "@shared/date-schemas";
import {yearTotals} from "@shared/time-report";
import {firstBookingDay} from "@shared/time-rules";
import {yearOf} from "@shared/week";
import {useReportData} from "@features/reports/use-report-data";

/** Der User sieht seinen Jahresbericht für ein Jahr "JJJJ" */
export function useShowYearlyReport(year: Year) {
    const {currentUser, now, today, bookings, vacations, holidays, sickLeaves, soll, isPending, error, retry} =
        useReportData();

    const currentYear = yearOf(today);
    const firstDay = firstBookingDay(bookings);

    const totals = useMemo(
        () => yearTotals(bookings, year, vacations, holidays, sickLeaves, soll, today, new Date(now)),
        [bookings, vacations, holidays, sickLeaves, soll, year, today, now],
    );

    return {
        currentUser,
        currentYear,
        // Frühestes Jahr: das der ersten Buchung, ohne Buchungen das laufende
        firstYear: firstDay ? yearOf(firstDay) : currentYear,
        totals,
        futureYear: `${year}-01-01` > today,
        partial: totals.targetToDateMs !== totals.targetYearMs,
        isPending,
        error,
        retry,
    };
}
