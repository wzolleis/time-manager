import {useMemo} from "react";
import {toBooking} from "@/api/time-entries";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useOvertime} from "@/views/overtime";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {useVacations} from "@/views/vacations";
import {overtimeBalanceMs} from "@shared/overtime-rules";
import {localDay} from "@shared/time-rules";

/** Der User sieht seine Überstunden: den Saldo und die letzte Korrektur */
export function useShowOvertime() {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const overtime = useOvertime(userId);
    const entries = useTimeEntries(userId);
    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);
    const sickLeaves = useSickLeaves(userId);

    const today = localDay(new Date(now));
    const bookings = useMemo(() => (entries.data ?? []).map(toBooking), [entries.data]);
    const correction = useMemo(
        () => (overtime.data ? {offset: overtime.data.offset, created: new Date(overtime.data.created)} : null),
        [overtime.data],
    );

    const balanceMs = useMemo(
        () =>
            overtimeBalanceMs(
                correction,
                bookings,
                vacations.data ?? [],
                holidays.data ?? [],
                sickLeaves.data ?? [],
                today,
                new Date(now),
            ),
        [correction, bookings, vacations.data, holidays.data, sickLeaves.data, today, now],
    );

    const views = [overtime, entries, vacations, holidays, sickLeaves];
    return {
        currentUser,
        balanceMs,
        correction, // null: noch keine Korrektur
        isPending: views.some((v) => v.isPending),
        error: views.find((v) => v.error)?.error ?? null,
        retry: () => Promise.all(views.map((v) => v.refetch())),
    };
}
