import {useMutation, useQueryClient} from "@tanstack/react-query";
import {type Day, toTimeOfDay} from "@shared/date-schemas";
import {type TimeEntryDto, toBooking, updateTimeEntry} from "@/api/time-entries";
import {formatTime} from "@shared/format";
import {useCurrentUser} from "@/lib/user-context";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {optimisticTimeEntries, withChanged} from "@features/reports/time-entries-cache";
import {localTimeToUtc} from "@shared/day-range";
import {isSickDay, sickDayMessage} from "@shared/sick-leave-rules";
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
// Eine ungültige Uhrzeit ergibt ebenfalls null, es gibt dann nichts zu ändern.
const changedBookedAt = (entry: Entry, time: string): Date | null => {
    const valid = toTimeOfDay(time);
    return !valid || time === formatTime(entry.bookedAt) ? null : localTimeToUtc(localDay(entry.bookedAt), valid);
};

// Nur Geändertes, leer: nichts zu tun
const patchOf = ({entry, time, projectId}: Change): TimeEntryUpdate => {
    const patch: TimeEntryUpdate = {};
    const bookedAt = changedBookedAt(entry, time);
    if (bookedAt) patch.bookedAt = bookedAt;
    const newProject = entry.type === "kommen" ? projectId : null;
    if (newProject !== entry.projectId) patch.projectId = newProject;
    return patch;
};

// Die Buchungen mit der Änderung, für den Cache und die Prüfung der Abfolge
const applyChange = (list: TimeEntryDto[], change: Change) => {
    const {bookedAt, projectId} = patchOf(change);
    return withChanged(list, change.entry.id, {
        ...(bookedAt && {bookedAt: bookedAt.toISOString()}),
        ...(projectId !== undefined && {projectId}),
    });
};

/** Der User ändert Uhrzeit oder Projekt einer Buchung */
export function useChangeTimeEntry() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge
    const sickLeaves = useSickLeaves(currentUser?.id); // für den Hinweis an Krankheitstagen

    const save = useMutation({
        mutationFn: async (change: Change) => {
            const patch = patchOf(change);
            if (Object.keys(patch).length === 0) return;
            await updateTimeEntry(currentUser!.id, change.entry.id, patch);
        },
        ...optimisticTimeEntries(qc, currentUser?.id, applyChange),
    });

    /** Service, null = alles in Ordnung. Ohne neue Uhrzeit gibt es nichts zu prüfen. */
    const problem = ({entry, time}: Pick<Change, "entry" | "time">) => {
        if (!time || !changedBookedAt(entry, time)) return null;
        const changed = applyChange(entries.data ?? [], {entry, time, projectId: entry.projectId});
        return checkSequence(changed.map(toBooking));
    };

    return {
        problem,
        // Hinweis, wenn der Tag ("JJJJ-MM-TT") ein Krankheitstag ist. Speichern bleibt möglich.
        sickNotice: (day: Day) => (isSickDay(day, sickLeaves.data ?? []) ? sickDayMessage(day) : null),
        change: save.mutate,
    };
}
