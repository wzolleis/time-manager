import {useMutation, useQueryClient} from "@tanstack/react-query";
import {type Day, parseTimeOfDay, toTimeOfDay} from "@shared/date-schemas";
import {createTimeEntryDay, toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {useUserSettings} from "@/views/user-settings";
import {useVacations} from "@/views/vacations";
import {isSickDay, sickDayMessage} from "@shared/sick-leave-rules";
import {targetMs} from "@shared/target-hours";
import {
    checkWorkDay,
    earliestStart,
    localDay,
    planWorkDay,
    suggestedWorkMinutes,
    type WorkDayPlan,
} from "@shared/time-rules";
import {SOLL_SETTING_ID} from "@shared/user-setting";
import {historyOf} from "@shared/user-setting-rules";

type WorkDay = {
    day: Day; // "JJJJ-MM-TT"
    start?: string; // "HH:mm" aus dem Formular, ohne: 08:00 am leeren Tag, sonst so früh wie möglich
    workMinutes: number;
};

/** Der User trägt einen Zeitraum nach: einen ganzen Tag oder eine Arbeitszeit nach den Buchungen des Tages */
export function useAddTimeEntryDay() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge
    const sickLeaves = useSickLeaves(currentUser?.id); // für den Hinweis an Krankheitstagen und das Soll
    const vacations = useVacations(currentUser?.id); // für das Soll
    const holidays = useHolidays(currentUser?.id); // für das Soll
    const settings = useUserSettings(currentUser?.id); // für das Soll

    const save = useMutation({
        mutationFn: ({start, ...data}: WorkDay & {projectId: string | null}) =>
            createTimeEntryDay(currentUser!.id, {...data, start: start ? parseTimeOfDay(start) : undefined}),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    const bookings = (entries.data ?? []).map(toBooking);
    const startOf = (start?: string) => (start ? (toTimeOfDay(start) ?? undefined) : undefined);

    // Soll des Tages in Minuten. Der Tag selbst gilt als Beginn der Zeiterfassung: Wer an einem Arbeitstag vor der
    // ersten Buchung nachträgt, beginnt damit die Zeiterfassung, das Soll ist dann nicht 0.
    const targetMinutes = (day: Day) =>
        targetMs(
            day,
            vacations.data ?? [],
            holidays.data ?? [],
            sickLeaves.data ?? [],
            day,
            historyOf(settings.data, SOLL_SETTING_ID),
        ) / 60_000;

    /** Service, null = alles in Ordnung. Ohne Arbeitszeit gibt es noch nichts zu prüfen. */
    const problem = ({day, start, workMinutes}: WorkDay) =>
        workMinutes ? checkWorkDay(bookings, day, workMinutes, startOf(start)) : null;

    return {
        currentUser,
        problem,
        // Die Buchungen und die Pause, die beim Speichern entstehen, für die Vorschau im Dialog
        preview: ({day, start, workMinutes}: WorkDay): WorkDayPlan =>
            workMinutes > 0 ? planWorkDay(bookings, day, workMinutes, startOf(start)) : {bookings: [], pauseMinutes: 0},
        // Hat der Tag ("JJJJ-MM-TT") schon Buchungen? Dann gibt es keine Vorgabe für den Beginn.
        hasBookings: (day: Day) => bookings.some((b) => localDay(b.bookedAt) === day),
        // Vorgabe der Arbeitszeit in Minuten: der Rest zum Soll des Tages, sonst 1 h
        suggestedWorkMinutes: (day: Day) => suggestedWorkMinutes(bookings, day, targetMinutes(day)),
        // Frühester Beginn an einem Tag mit Buchungen, für den Platzhalter (null: leerer Tag oder offenes Kommen)
        earliestStart: (day: Day, workMinutes: number) => earliestStart(bookings, day, workMinutes),
        // Hinweis, wenn der Tag ("JJJJ-MM-TT") ein Krankheitstag ist. Speichern bleibt möglich.
        sickNotice: (day: Day) => (isSickDay(day, sickLeaves.data ?? []) ? sickDayMessage(day) : null),
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
