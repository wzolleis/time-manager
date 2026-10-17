import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteTimeEntry} from "@/api/time-entries";

type Deletion = {id: string; pair: boolean}; // pair: das Gegenstück wird mit gelöscht

/** Der User löscht eine Buchung, auf Wunsch zusammen mit ihrem Gegenstück */
export function useDeleteTimeEntry() {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: ({id, pair}: Deletion) => deleteTimeEntry(id, pair),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    return {
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
