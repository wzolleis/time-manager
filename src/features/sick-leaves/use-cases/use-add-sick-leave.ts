import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createSickLeave} from "@/api/sick-leaves";
import {toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useHolidays} from "@/views/holidays";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {checkSickLeave, countBookingsInRange} from "@shared/sick-leave-rules";
import {countWorkdays} from "@shared/vacation-rules";
import {toDayRange} from "@shared/day-range";
import {parseDay} from "@shared/date-schemas";

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
        mutationFn: (data: Addition) =>
            createSickLeave(currentUser!.id, {
                ...data,
                startDate: parseDay(data.startDate),
                endDate: parseDay(data.endDate),
            }),
        onSuccess: () => qc.invalidateQueries({queryKey: ["sick-leaves"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung
        problem: ({startDate, endDate}: Range) =>
            checkSickLeave(sickLeaves.data ?? [], {id: "neu", startDate, endDate}),
        sickDays: (input: Range) => {
            const range = toDayRange(input);
            return range ? countWorkdays(range.startDate, range.endDate, holidays.data ?? []) : 0;
        },
        entriesInRange: (input: Range) => {
            const range = toDayRange(input);
            return range ? countBookingsInRange((entries.data ?? []).map(toBooking), range) : 0;
        },
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
