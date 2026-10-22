import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTimeEntry, toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {localTimeToUtc} from "@shared/day-range";
import {isSickDay, sickDayMessage} from "@shared/sick-leave-rules";
import {checkSequence} from "@shared/time-rules";

type Addition = {
    type: "kommen" | "gehen";
    day: string; // "JJJJ-MM-TT"
    time: string; // "HH:mm"
    projectId: string | null;
};

/** Der User trägt eine vergessene Buchung nach */
export function useAddTimeEntry() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge
    const sickLeaves = useSickLeaves(currentUser?.id); // für den Hinweis an Krankheitstagen

    const save = useMutation({
        mutationFn: ({type, day, time, projectId}: Addition) =>
            createTimeEntry(currentUser!.id, {
                type,
                bookedAt: localTimeToUtc(day, time),
                projectId: type === "kommen" ? (projectId ?? undefined) : undefined,
            }),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    /** Service, null = alles in Ordnung. Ohne Uhrzeit gibt es noch nichts zu prüfen. */
    const problem = ({type, day, time}: Pick<Addition, "type" | "day" | "time">) => {
        if (!time) return null;
        const added = {id: "neu", type, bookedAt: localTimeToUtc(day, time)};
        return checkSequence([...(entries.data ?? []).map(toBooking), added]);
    };

    return {
        currentUser,
        problem,
        // Hinweis, wenn der Tag ("JJJJ-MM-TT") ein Krankheitstag ist. Speichern bleibt möglich.
        sickNotice: (day: string) => (isSickDay(day, sickLeaves.data ?? []) ? sickDayMessage(day) : null),
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
