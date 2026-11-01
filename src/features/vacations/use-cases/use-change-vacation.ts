import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateVacation} from "@/api/vacations";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useVacations} from "@/views/vacations";
import {useUserSettings} from "@/views/user-settings";
import type {Vacation, VacationUpdate} from "@shared/vacation";
import {checkVacation, countVacationDays} from "@shared/vacation-rules";
import {VACATION_DAYS_SETTING_ID} from "@shared/user-setting";
import {historyOf} from "@shared/user-setting-rules";
import {toDayRange} from "@shared/day-range";
import {parseDay} from "@shared/date-schemas";

type Change = {vacation: Vacation; startDate: string; endDate: string};

/** Der User verschiebt einen Urlaub oder ändert seine Dauer */
export function useChangeVacation() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    // für die Prüfung von Überschneidung und Jahresurlaub
    const vacations = useVacations(currentUser?.id);
    const holidays = useHolidays(currentUser?.id);
    const sickLeaves = useSickLeaves(currentUser?.id); // Krankheitstage im Urlaub verbrauchen keinen Urlaubstag
    const settings = useUserSettings(currentUser?.id); // Urlaubstage des Jahres

    const save = useMutation({
        mutationFn: async ({vacation, startDate, endDate}: Change) => {
            // Nur Geändertes senden
            const patch: VacationUpdate = {};
            if (startDate !== vacation.startDate) patch.startDate = parseDay(startDate);
            if (endDate !== vacation.endDate) patch.endDate = parseDay(endDate);
            if (Object.keys(patch).length === 0) return;
            await updateVacation(vacation.userId, vacation.id, patch);
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ["vacations"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung
        problem: ({vacation, startDate, endDate}: Change) =>
            checkVacation(
                vacations.data ?? [],
                {id: vacation.id, startDate, endDate},
                holidays.data ?? [],
                sickLeaves.data ?? [],
                historyOf(settings.data, VACATION_DAYS_SETTING_ID),
            ),
        workdays: (input: Pick<Change, "startDate" | "endDate">) => {
            const range = toDayRange(input);
            return range
                ? countVacationDays(range.startDate, range.endDate, holidays.data ?? [], sickLeaves.data ?? [])
                : 0;
        },
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
