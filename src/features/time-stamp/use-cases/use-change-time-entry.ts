import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toBooking, updateTimeEntry} from "@/api/time-entries";
import {formatTime} from "@/lib/format";
import {useCurrentUser} from "@/lib/user-context";
import {useTimeEntries} from "@/views/time-entries";
import {localTimeToUtc} from "@shared/day-range";
import type {TimeEntryUpdate} from "@shared/time-entry";
import {checkSequence, localDay} from "@shared/time-rules";

type Entry = {id: string; type: "kommen" | "gehen"; bookedAt: Date; projectId: string | null};

type Change = {
    entry: Entry;
    time: string; // "HH:mm", der Tag bleibt unverändert
    projectId: string | null;
};

// Die Zeit bleibt unangetastet, wenn sie nicht geändert wurde,
// damit die Sekunden der ursprünglichen Buchung erhalten bleiben.
const changedBookedAt = (entry: Entry, time: string): Date | null =>
    time === formatTime(entry.bookedAt) ? null : localTimeToUtc(localDay(entry.bookedAt), time);

/** Der User ändert Uhrzeit oder Projekt einer Buchung */
export function useChangeTimeEntry() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge

    const save = useMutation({
        mutationFn: async ({entry, time, projectId}: Change) => {
            // Nur Geändertes senden
            const patch: TimeEntryUpdate = {};
            const bookedAt = changedBookedAt(entry, time);
            if (bookedAt) patch.bookedAt = bookedAt;
            const newProject = entry.type === "kommen" ? projectId : null;
            if (newProject !== entry.projectId) patch.projectId = newProject;
            if (Object.keys(patch).length === 0) return;
            await updateTimeEntry(entry.id, patch);
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    /** Service, null = alles in Ordnung. Ohne neue Uhrzeit gibt es nichts zu prüfen. */
    const problem = ({entry, time}: Pick<Change, "entry" | "time">) => {
        const bookedAt = time ? changedBookedAt(entry, time) : null;
        if (!bookedAt) return null;
        const bookings = (entries.data ?? []).map(toBooking);
        return checkSequence(bookings.map((b) => (b.id === entry.id ? {...b, bookedAt} : b)));
    };

    return {
        problem,
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
