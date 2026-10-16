import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createHoliday} from "@/api/holidays";
import {checkHoliday} from "@shared/holiday-rules";
import type {HolidayCreate} from "@shared/holiday";

/** Ein Feiertag wird eingetragen: mit userId null für alle, sonst nur für diesen User */
export function useAddHoliday() {
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: (data: HolidayCreate) => createHoliday(data),
        onSuccess: () => qc.invalidateQueries({queryKey: ["holidays"]}),
    });

    return {
        problem: checkHoliday, // Service, null = alles in Ordnung
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
