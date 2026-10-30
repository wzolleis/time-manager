import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTimeEntryDay, toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {isSickDay, sickDayMessage} from "@shared/sick-leave-rules";
import {type Booking, checkWorkDay, planWorkDay} from "@shared/time-rules";

type WorkDay = {
    day: string; // "JJJJ-MM-TT"
    start: string; // "HH:mm"
    workMinutes: number;
};

/** Der User trägt einen ganzen Tag mit seiner Arbeitszeit nach */
export function useAddTimeEntryDay() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge
    const sickLeaves = useSickLeaves(currentUser?.id); // für den Hinweis an Krankheitstagen

    const save = useMutation({
        mutationFn: (data: WorkDay & {projectId: string | null}) => createTimeEntryDay(currentUser!.id, data),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    /** Service, null = alles in Ordnung. Ohne Beginn oder Arbeitszeit gibt es noch nichts zu prüfen. */
    const problem = ({day, start, workMinutes}: WorkDay) => {
        if (!start || !workMinutes) return null;
        return checkWorkDay((entries.data ?? []).map(toBooking), day, start, workMinutes);
    };

    return {
        currentUser,
        problem,
        // Die Buchungen, die beim Speichern entstehen, für die Vorschau im Dialog
        preview: ({day, start, workMinutes}: WorkDay): Booking[] =>
            start && workMinutes > 0 ? planWorkDay(day, start, workMinutes) : [],
        // Hinweis, wenn der Tag ("JJJJ-MM-TT") ein Krankheitstag ist. Speichern bleibt möglich.
        sickNotice: (day: string) => (isSickDay(day, sickLeaves.data ?? []) ? sickDayMessage(day) : null),
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
