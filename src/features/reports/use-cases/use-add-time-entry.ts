import {useMutation, useQueryClient} from "@tanstack/react-query";
import {type Day, parseTimeOfDay, toTimeOfDay} from "@shared/date-schemas";
import {createTimeEntry, type TimeEntryDto, toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {optimisticId, optimisticTimeEntries, withAdded} from "@features/reports/time-entries-cache";
import {localTimeToUtc} from "@shared/day-range";
import {isSickDay, sickDayMessage} from "@shared/sick-leave-rules";
import {checkSequence} from "@shared/time-rules";

type Addition = {
    type: "kommen" | "gehen";
    day: Day; // "JJJJ-MM-TT"
    time: string; // "HH:mm" aus dem Formular, noch ungeprüft
    projectId: string | null;
};

/** Der User trägt eine vergessene Buchung nach */
export function useAddTimeEntry() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge
    const sickLeaves = useSickLeaves(currentUser?.id); // für den Hinweis an Krankheitstagen

    const userId = currentUser?.id;

    // Die neue Buchung, wie sie im Cache steht, bis der Server die echte liefert
    const added = ({type, day, time, projectId}: Addition): TimeEntryDto => ({
        id: optimisticId(),
        userId: userId!,
        type,
        bookedAt: localTimeToUtc(day, parseTimeOfDay(time)).toISOString(),
        projectId: type === "kommen" ? projectId : null,
    });

    const save = useMutation({
        mutationFn: ({type, day, time, projectId}: Addition) =>
            createTimeEntry(userId!, {
                type,
                bookedAt: localTimeToUtc(day, parseTimeOfDay(time)),
                projectId: type === "kommen" ? (projectId ?? undefined) : undefined,
            }),
        ...optimisticTimeEntries(qc, userId, (list, addition: Addition) => withAdded(list, added(addition))),
    });

    /** Service, null = alles in Ordnung. Ohne gültige Uhrzeit gibt es noch nichts zu prüfen. */
    const problem = (addition: Pick<Addition, "type" | "day" | "time">) => {
        if (!toTimeOfDay(addition.time)) return null;
        return checkSequence(withAdded(entries.data ?? [], added({...addition, projectId: null})).map(toBooking));
    };

    return {
        currentUser,
        problem,
        // Hinweis, wenn der Tag ("JJJJ-MM-TT") ein Krankheitstag ist. Speichern bleibt möglich.
        sickNotice: (day: Day) => (isSickDay(day, sickLeaves.data ?? []) ? sickDayMessage(day) : null),
        add: save.mutate,
    };
}
