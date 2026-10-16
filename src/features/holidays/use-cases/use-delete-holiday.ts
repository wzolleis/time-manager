import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteHoliday} from "@/api/holidays";

/** Ein Feiertag wird gelöscht. Ein globaler fehlt danach bei allen Usern. */
export function useDeleteHoliday() {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: (id: string) => deleteHoliday(id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["holidays"]}),
    });

    return {
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
