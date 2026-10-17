import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateVacation} from "@/api/vacations";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useVacations} from "@/views/vacations";
import type {Vacation, VacationUpdate} from "@shared/vacation";
import {checkVacation, countVacationDays} from "@shared/vacation-rules";

type Change = {vacation: Vacation; startDate: string; endDate: string};

/** Der User verschiebt einen Urlaub oder ändert seine Dauer */
export function useChangeVacation() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    // für die Prüfung von Überschneidung und Jahresurlaub
    const vacations = useVacations(currentUser?.id);
    const holidays = useHolidays(currentUser?.id);
    const sickLeaves = useSickLeaves(currentUser?.id); // Krankheitstage im Urlaub verbrauchen keinen Urlaubstag

    const save = useMutation({
        mutationFn: async ({vacation, startDate, endDate}: Change) => {
            // Nur Geändertes senden
            const patch: VacationUpdate = {};
            if (startDate !== vacation.startDate) patch.startDate = startDate;
            if (endDate !== vacation.endDate) patch.endDate = endDate;
            if (Object.keys(patch).length === 0) return;
            await updateVacation(vacation.id, patch);
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
            ),
        workdays: ({startDate, endDate}: Pick<Change, "startDate" | "endDate">) =>
            countVacationDays(startDate, endDate, holidays.data ?? [], sickLeaves.data ?? []),
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
