import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useVacations} from "@/views/vacations";
import {localDay} from "@shared/time-rules";
import type {Vacation} from "@shared/vacation";
import {countVacationDays, dayCount, vacationBalance} from "@shared/vacation-rules";

export type VacationRow = Vacation & {days: number; workdays: number};

/** Der User sieht seine Urlaube eines Jahres und sein Urlaubskonto */
export function useShowVacations(year: number) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);
    const sickLeaves = useSickLeaves(userId); // Krankheitstage im Urlaub verbrauchen keinen Urlaubstag

    const today = localDay(new Date(now));

    // Nur Urlaube, die zumindest teilweise im gewählten Jahr liegen
    const rows = useMemo<VacationRow[]>(
        () =>
            (vacations.data ?? [])
                .filter((v) => v.startDate <= `${year}-12-31` && v.endDate >= `${year}-01-01`)
                .map((v) => ({
                    ...v,
                    days: dayCount(v.startDate, v.endDate),
                    workdays: countVacationDays(v.startDate, v.endDate, holidays.data ?? [], sickLeaves.data ?? []),
                })),
        [vacations.data, holidays.data, sickLeaves.data, year],
    );
    const balance = useMemo(
        () => vacationBalance(vacations.data ?? [], year, today, holidays.data ?? [], sickLeaves.data ?? []),
        [vacations.data, holidays.data, sickLeaves.data, year, today],
    );

    return {
        currentUser,
        currentYear: Number(today.slice(0, 4)),
        rows,
        balance,
        isPending: vacations.isPending || holidays.isPending || sickLeaves.isPending,
        error: vacations.error ?? holidays.error ?? sickLeaves.error,
        retry: () => Promise.all([vacations.refetch(), holidays.refetch(), sickLeaves.refetch()]),
    };
}
