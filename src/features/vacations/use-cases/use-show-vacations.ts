import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useVacations} from "@/views/vacations";
import {useUserSettings} from "@/views/user-settings";
import {localDay} from "@shared/time-rules";
import {VACATION_DAYS_SETTING_ID} from "@shared/user-setting";
import {historyOf} from "@shared/user-setting-rules";
import type {Vacation} from "@shared/vacation";
import {countVacationDays, dayCount, vacationBalance, vacationDaysOfYear} from "@shared/vacation-rules";

export type VacationRow = Vacation & {days: number; workdays: number};

/** Der User sieht seine Urlaube eines Jahres und sein Urlaubskonto */
export function useShowVacations(year: number) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const vacations = useVacations(userId);
    const holidays = useHolidays(userId);
    const sickLeaves = useSickLeaves(userId); // Krankheitstage im Urlaub verbrauchen keinen Urlaubstag
    const settings = useUserSettings(userId);
    const vacationDays = useMemo(() => historyOf(settings.data, VACATION_DAYS_SETTING_ID), [settings.data]);

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
        () =>
            vacationBalance(
                vacations.data ?? [],
                year,
                today,
                holidays.data ?? [],
                sickLeaves.data ?? [],
                vacationDays,
            ),
        [vacations.data, holidays.data, sickLeaves.data, vacationDays, year, today],
    );

    return {
        currentUser,
        currentYear: Number(today.slice(0, 4)),
        rows,
        balance,
        allowed: vacationDaysOfYear(vacationDays, year), // Urlaubstage des Jahres aus den Einstellungen
        isPending: vacations.isPending || holidays.isPending || sickLeaves.isPending || settings.isPending,
        error: vacations.error ?? holidays.error ?? sickLeaves.error ?? settings.error,
        retry: () => Promise.all([vacations.refetch(), holidays.refetch(), sickLeaves.refetch(), settings.refetch()]),
    };
}
