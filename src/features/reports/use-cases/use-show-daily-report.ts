import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useProjects} from "@/views/projects";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {useVacations} from "@/views/vacations";
import {localDayRange} from "@shared/day-range";
import {holidayOn} from "@shared/holiday-rules";
import {isSickDay} from "@shared/sick-leave-rules";
import {dayKind, targetMs} from "@shared/target-hours";
import {dayDiffMs, dayTotals} from "@shared/time-report";
import {firstBookingDay, localDay, nextType} from "@shared/time-rules";
import type {EntryRow} from "@features/time-stamp/time-entry-row";

export type DailyReportRow = EntryRow & {ignored: boolean}; // ignored: am Krankheitstag, zählt nicht

/** Der User sieht seinen Tagesbericht für einen Tag "JJJJ-MM-TT" */
export function useShowDailyReport(day: string) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const entries = useTimeEntries(userId);
    const projects = useProjects();
    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);
    const sickLeaves = useSickLeaves(userId);

    const today = localDay(new Date(now));
    const range = useMemo(() => localDayRange(day), [day]);

    const report = useMemo(() => {
        const dtos = entries.data ?? [];
        const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
        const sickList = sickLeaves.data ?? [];

        const rows: DailyReportRow[] = dtos
            .map((e) => ({
                id: e.id,
                type: e.type,
                bookedAt: new Date(e.bookedAt),
                projectId: e.projectId,
                projectName: e.projectId ? (names.get(e.projectId) ?? null) : null,
                ignored: isSickDay(localDay(new Date(e.bookedAt)), sickList),
            }))
            .filter((r) => r.bookedAt >= range.start && r.bookedAt < range.end);

        // Für die Summen zählen alle Buchungen außer denen an Krankheitstagen, damit Nachtschichten stimmen
        const all = dtos.map((e) => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)}));
        return {
            rows,
            trackingStart: firstBookingDay(all), // mit allen Buchungen, auch denen an Krankheitstagen
            totals: dayTotals(all, range, sickList, new Date(now)),
            next: nextType(all, range.end), // was ist am Ende dieses Tages als Nächstes dran
        };
    }, [entries.data, projects.data, sickLeaves.data, range, now]);

    const vacationList = vacations.data ?? [];
    const holidayList = holidays.data ?? [];
    const sickList = sickLeaves.data ?? [];
    const target = targetMs(day, vacationList, holidayList, sickList, report.trackingStart);

    return {
        currentUser,
        today,
        range,
        rows: report.rows,
        totals: report.totals,
        next: report.next,
        target,
        kind: dayKind(day, vacationList, holidayList, sickList, report.trackingStart),
        holidayName: holidayOn(day, holidayList)?.name,
        diff: dayDiffMs(day, today, report.totals.workMs, target), // null: Zukunft oder freier Tag ohne Arbeit
        isPending: entries.isPending || vacations.isPending || holidays.isPending || sickLeaves.isPending,
        error: entries.error ?? vacations.error ?? holidays.error ?? sickLeaves.error,
        retry: () => Promise.all([entries.refetch(), vacations.refetch(), holidays.refetch(), sickLeaves.refetch()]),
    };
}
