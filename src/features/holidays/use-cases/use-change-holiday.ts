import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateHoliday} from "@/api/holidays";
import {checkHoliday} from "@shared/holiday-rules";
import type {Holiday, HolidayUpdate} from "@shared/holiday";

type Change = {holiday: Holiday; date: string; name: string};

/** Datum oder Name eines Feiertags werden geändert */
export function useChangeHoliday() {
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: async ({holiday, date, name}: Change) => {
            // Nur Geändertes senden
            const patch: HolidayUpdate = {};
            if (date !== holiday.date) patch.date = date;
            if (name.trim() !== holiday.name) patch.name = name;
            if (Object.keys(patch).length === 0) return;
            await updateHoliday(holiday.id, patch);
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ["holidays"]}),
    });

    return {
        problem: checkHoliday, // Service, null = alles in Ordnung
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
