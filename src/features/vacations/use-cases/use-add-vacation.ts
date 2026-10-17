import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createVacation} from "@/api/vacations";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useVacations} from "@/views/vacations";
import {checkVacation, countVacationDays} from "@shared/vacation-rules";

type Addition = {startDate: string; endDate: string};

/** Der User trägt einen Urlaub ein */
export function useAddVacation() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    // für die Prüfung von Überschneidung und Jahresurlaub
    const vacations = useVacations(currentUser?.id);
    const holidays = useHolidays(currentUser?.id);
    const sickLeaves = useSickLeaves(currentUser?.id); // Krankheitstage im Urlaub verbrauchen keinen Urlaubstag

    const save = useMutation({
        mutationFn: (data: Addition) => createVacation({userId: currentUser!.id, ...data}),
        onSuccess: () => qc.invalidateQueries({queryKey: ["vacations"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung
        problem: ({startDate, endDate}: Addition) =>
            checkVacation(
                vacations.data ?? [],
                {id: "neu", startDate, endDate},
                holidays.data ?? [],
                sickLeaves.data ?? [],
            ),
        workdays: ({startDate, endDate}: Addition) =>
            countVacationDays(startDate, endDate, holidays.data ?? [], sickLeaves.data ?? []),
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
