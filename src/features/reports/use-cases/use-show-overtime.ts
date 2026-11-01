import {useMemo} from "react";
import {useOvertime} from "@/views/overtime";
import {overtimeBalanceMs} from "@shared/overtime-rules";
import {useReportData} from "@features/reports/use-report-data";

/** Der User sieht seine Überstunden: den Saldo und die letzte Korrektur */
export function useShowOvertime() {
    const data = useReportData();
    const {currentUser, now, today, bookings, vacations, holidays, sickLeaves, soll} = data;

    const overtime = useOvertime(currentUser?.id);
    const correction = useMemo(
        () => (overtime.data ? {offset: overtime.data.offset, created: new Date(overtime.data.created)} : null),
        [overtime.data],
    );

    const balanceMs = useMemo(
        () => overtimeBalanceMs(correction, bookings, vacations, holidays, sickLeaves, soll, today, new Date(now)),
        [correction, bookings, vacations, holidays, sickLeaves, soll, today, now],
    );

    return {
        currentUser,
        balanceMs,
        correction, // null: noch keine Korrektur
        isPending: overtime.isPending || data.isPending,
        error: overtime.error ?? data.error,
        retry: () => Promise.all([overtime.refetch(), data.retry()]),
    };
}
