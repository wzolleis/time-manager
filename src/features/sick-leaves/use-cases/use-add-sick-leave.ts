import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createSickLeave} from "@/api/sick-leaves";
import {toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {checkSickLeave, countBookingsInRange} from "@shared/sick-leave-rules";
import {countWorkdays} from "@shared/vacation-rules";

type Addition = {startDate: string; endDate: string; note: string | null};
type Range = Pick<Addition, "startDate" | "endDate">;

/** Der User trägt eine Krankmeldung ein */
export function useAddSickLeave() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const sickLeaves = useSickLeaves(currentUser?.id); // für die Prüfung der Überschneidung
    const holidays = useHolidays(currentUser?.id);
    const entries = useTimeEntries(currentUser?.id); // für den Hinweis auf Buchungen im Zeitraum

    const save = useMutation({
        mutationFn: (data: Addition) => createSickLeave({userId: currentUser!.id, ...data}),
        onSuccess: () => qc.invalidateQueries({queryKey: ["sick-leaves"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung
        problem: ({startDate, endDate}: Range) =>
            checkSickLeave(sickLeaves.data ?? [], {id: "neu", startDate, endDate}),
        sickDays: ({startDate, endDate}: Range) => countWorkdays(startDate, endDate, holidays.data ?? []),
        entriesInRange: (range: Range) => countBookingsInRange((entries.data ?? []).map(toBooking), range),
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
