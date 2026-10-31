import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTimeEntryDay, toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {isSickDay, sickDayMessage} from "@shared/sick-leave-rules";
import {checkWorkDay, earliestStart, localDay, planWorkDay, type WorkDayPlan} from "@shared/time-rules";

type WorkDay = {
    day: string; // "JJJJ-MM-TT"
    start?: string; // "HH:mm", ohne: 08:00 am leeren Tag, sonst so früh wie möglich
    workMinutes: number;
};

/** Der User trägt einen Zeitraum nach: einen ganzen Tag oder eine Arbeitszeit nach den Buchungen des Tages */
export function useAddTimeEntryDay() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge
    const sickLeaves = useSickLeaves(currentUser?.id); // für den Hinweis an Krankheitstagen

    const save = useMutation({
        mutationFn: (data: WorkDay & {projectId: string | null}) => createTimeEntryDay(currentUser!.id, data),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    const bookings = (entries.data ?? []).map(toBooking);

    /** Service, null = alles in Ordnung. Ohne Arbeitszeit gibt es noch nichts zu prüfen. */
    const problem = ({day, start, workMinutes}: WorkDay) =>
        workMinutes ? checkWorkDay(bookings, day, workMinutes, start || undefined) : null;

    return {
        currentUser,
        problem,
        // Die Buchungen und die Pause, die beim Speichern entstehen, für die Vorschau im Dialog
        preview: ({day, start, workMinutes}: WorkDay): WorkDayPlan =>
            workMinutes > 0
                ? planWorkDay(bookings, day, workMinutes, start || undefined)
                : {bookings: [], pauseMinutes: 0},
        // Hat der Tag ("JJJJ-MM-TT") schon Buchungen? Dann gibt es keine Vorgaben für Beginn und Arbeitszeit.
        hasBookings: (day: string) => bookings.some((b) => localDay(b.bookedAt) === day),
        // Frühester Beginn an einem Tag mit Buchungen, für den Platzhalter (null: leerer Tag oder offenes Kommen)
        earliestStart: (day: string, workMinutes: number) => earliestStart(bookings, day, workMinutes),
        // Hinweis, wenn der Tag ("JJJJ-MM-TT") ein Krankheitstag ist. Speichern bleibt möglich.
        sickNotice: (day: string) => (isSickDay(day, sickLeaves.data ?? []) ? sickDayMessage(day) : null),
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
