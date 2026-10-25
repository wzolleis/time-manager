import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {useVacations} from "@/views/vacations";
import {useUserSettings} from "@/views/user-settings";
import {weekTotals} from "@shared/time-report";
import {localDay} from "@shared/time-rules";
import {isoWeek, weekDays} from "@shared/week";
import {SOLL_SETTING_ID} from "@shared/user-setting";
import {historyOf} from "@shared/user-setting-rules";

/** Der User sieht seinen Wochenbericht für die Woche, in der anchor "JJJJ-MM-TT" liegt */
export function useShowWeeklyReport(anchor: string) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const entries = useTimeEntries(userId);
    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);
    const sickLeaves = useSickLeaves(userId);
    const settings = useUserSettings(userId);
    const soll = useMemo(() => historyOf(settings.data, SOLL_SETTING_ID), [settings.data]);

    const today = localDay(new Date(now));
    const days = useMemo(() => weekDays(anchor), [anchor]);

    const totals = useMemo(() => {
        const all = (entries.data ?? []).map((e) => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)}));
        return weekTotals(
            all,
            days,
            vacations.data ?? [],
            holidays.data ?? [],
            sickLeaves.data ?? [],
            soll,
            today,
            new Date(now),
        );
    }, [entries.data, vacations.data, holidays.data, sickLeaves.data, soll, days, today, now]);

    return {
        currentUser,
        today,
        ...isoWeek(anchor),
        totals,
        thisWeek: weekDays(today)[0] === days[0],
        futureWeek: days[0] > today,
        partial: totals.targetToDateMs !== totals.targetWeekMs,
        isPending:
            entries.isPending ||
            vacations.isPending ||
            holidays.isPending ||
            sickLeaves.isPending ||
            settings.isPending,
        error: entries.error ?? vacations.error ?? holidays.error ?? sickLeaves.error ?? settings.error,
        retry: () =>
            Promise.all([
                entries.refetch(),
                vacations.refetch(),
                holidays.refetch(),
                sickLeaves.refetch(),
                settings.refetch(),
            ]),
    };
}
