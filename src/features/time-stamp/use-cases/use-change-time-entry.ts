import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateTimeEntry} from "@/api/time-entries";
import {formatTime} from "@/lib/format";
import {localTimeToUtc} from "@shared/day-range";
import type {TimeEntryUpdate} from "@shared/time-entry";
import {localDay} from "@shared/time-rules";

type Change = {
    entry: {id: string; type: "kommen" | "gehen"; bookedAt: Date; projectId: string | null};
    time: string; // "HH:mm", der Tag bleibt unverändert
    projectId: string | null;
};

/** Der User ändert Uhrzeit oder Projekt einer Buchung */
export function useChangeTimeEntry() {
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: async ({entry, time, projectId}: Change) => {
            // Nur Geändertes senden. Die Zeit bleibt unangetastet, wenn sie nicht geändert wurde,
            // damit die Sekunden der ursprünglichen Buchung erhalten bleiben.
            const patch: TimeEntryUpdate = {};
            if (time !== formatTime(entry.bookedAt)) {
                patch.bookedAt = localTimeToUtc(localDay(entry.bookedAt), time);
            }
            const newProject = entry.type === "kommen" ? projectId : null;
            if (newProject !== entry.projectId) patch.projectId = newProject;
            if (Object.keys(patch).length === 0) return;
            await updateTimeEntry(entry.id, patch);
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    return {
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
