import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateSickLeave} from "@/api/sick-leaves";
import {toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import type {SickLeave, SickLeaveUpdate} from "@shared/sick-leave";
import {checkSickLeave, countBookingsInRange} from "@shared/sick-leave-rules";
import {countWorkdays} from "@shared/vacation-rules";
import {toDayRange} from "@shared/day-range";
import {parseDay} from "@shared/date-schemas";

type Change = {sickLeave: SickLeave; startDate: string; endDate: string; note: string | null};
type Range = Pick<Change, "startDate" | "endDate">;

/** Der User ändert Zeitraum oder Notiz einer Krankmeldung */
export function useChangeSickLeave() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const sickLeaves = useSickLeaves(currentUser?.id); // für die Prüfung der Überschneidung
    const holidays = useHolidays(currentUser?.id);
    const entries = useTimeEntries(currentUser?.id); // für den Hinweis auf Buchungen im Zeitraum

    const save = useMutation({
        mutationFn: async ({sickLeave, startDate, endDate, note}: Change) => {
            // Nur Geändertes senden
            const patch: SickLeaveUpdate = {};
            if (startDate !== sickLeave.startDate) patch.startDate = parseDay(startDate);
            if (endDate !== sickLeave.endDate) patch.endDate = parseDay(endDate);
            if (note !== sickLeave.note) patch.note = note;
            if (Object.keys(patch).length === 0) return;
            await updateSickLeave(sickLeave.userId, sickLeave.id, patch);
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ["sick-leaves"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung
        problem: ({sickLeave, startDate, endDate}: Omit<Change, "note">) =>
            checkSickLeave(sickLeaves.data ?? [], {id: sickLeave.id, startDate, endDate}),
        sickDays: (input: Range) => {
            const range = toDayRange(input);
            return range ? countWorkdays(range.startDate, range.endDate, holidays.data ?? []) : 0;
        },
        entriesInRange: (input: Range) => {
            const range = toDayRange(input);
            return range ? countBookingsInRange((entries.data ?? []).map(toBooking), range) : 0;
        },
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
