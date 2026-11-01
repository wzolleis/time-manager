import {useMemo} from "react";
import {toBooking} from "@/api/time-entries";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {useVacations} from "@/views/vacations";
import {useUserSettings} from "@/views/user-settings";
import {localDay} from "@shared/time-rules";
import {SOLL_SETTING_ID} from "@shared/user-setting";
import {historyOf} from "@shared/user-setting-rules";

// Immer dieselbe leere Liste, solange nichts geladen ist: die useMemo der Berichte rechnen sonst bei jedem Rendern neu
const NONE: never[] = [];

/**
 * Die Daten, aus denen die Berichte des angemeldeten Users rechnen: Buchungen, Urlaube, Feiertage,
 * Krankmeldungen und die History des Solls, dazu der Ladezustand dieser Abfragen.
 */
export function useReportData() {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const entries = useTimeEntries(userId);
    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);
    const sickLeaves = useSickLeaves(userId);
    const settings = useUserSettings(userId);

    const soll = useMemo(() => historyOf(settings.data, SOLL_SETTING_ID), [settings.data]);
    const bookings = useMemo(() => (entries.data ?? NONE).map(toBooking), [entries.data]);

    return {
        currentUser,
        now,
        today: localDay(new Date(now)),
        entries: entries.data ?? NONE, // die Buchungen, wie die API sie liefert
        bookings, // die Buchungen für die Regeln aus shared/
        vacations: vacations.data ?? NONE,
        holidays: holidays.data ?? NONE,
        sickLeaves: sickLeaves.data ?? NONE,
        soll,
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
