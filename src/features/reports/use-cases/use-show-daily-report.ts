import {useMemo} from "react";
import type {Day} from "@shared/date-schemas";
import {useProjects} from "@/views/projects";
import {localDayRange} from "@shared/day-range";
import {holidayOn} from "@shared/holiday-rules";
import {isSickDay} from "@shared/sick-leave-rules";
import {dayKind, targetMs} from "@shared/target-hours";
import {dayDiffMs, dayTotals} from "@shared/time-report";
import {firstBookingDay, localDay, nextType} from "@shared/time-rules";
import type {EntryRow} from "@features/reports/time-entry-row";
import {useReportData} from "@features/reports/use-report-data";

export type DailyReportRow = EntryRow & {ignored: boolean}; // ignored: am Krankheitstag, zählt nicht

/** Der User sieht seinen Tagesbericht für einen Tag "JJJJ-MM-TT" */
export function useShowDailyReport(day: Day) {
    const {currentUser, now, today, entries, bookings, vacations, holidays, sickLeaves, soll, isPending, error, retry} =
        useReportData();
    const projects = useProjects();

    const range = useMemo(() => localDayRange(day), [day]);

    const report = useMemo(() => {
        const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));

        const rows: DailyReportRow[] = entries
            .map((e) => ({
                id: e.id,
                type: e.type,
                bookedAt: new Date(e.bookedAt),
                projectId: e.projectId,
                projectName: e.projectId ? (names.get(e.projectId) ?? null) : null,
                ignored: isSickDay(localDay(new Date(e.bookedAt)), sickLeaves),
            }))
            .filter((r) => r.bookedAt >= range.start && r.bookedAt < range.end);

        // Für die Summen zählen alle Buchungen außer denen an Krankheitstagen, damit Nachtschichten stimmen
        return {
            rows,
            trackingStart: firstBookingDay(bookings), // mit allen Buchungen, auch denen an Krankheitstagen
            totals: dayTotals(bookings, range, sickLeaves, new Date(now)),
            next: nextType(bookings, range.end), // was ist am Ende dieses Tages als Nächstes dran
        };
    }, [entries, bookings, projects.data, sickLeaves, range, now]);

    const target = targetMs(day, vacations, holidays, sickLeaves, report.trackingStart, soll);

    return {
        currentUser,
        today,
        range,
        rows: report.rows,
        totals: report.totals,
        next: report.next,
        target,
        kind: dayKind(day, vacations, holidays, sickLeaves, report.trackingStart),
        holidayName: holidayOn(day, holidays)?.name,
        diff: dayDiffMs(day, today, report.totals.workMs, target), // null: Zukunft oder freier Tag ohne Arbeit
        isPending,
        error,
        retry,
    };
}
