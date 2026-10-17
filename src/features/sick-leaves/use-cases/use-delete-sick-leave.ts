import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteSickLeave} from "@/api/sick-leaves";

/** Der User löscht eine Krankmeldung. Die Buchungen an den Tagen zählen danach wieder. */
export function useDeleteSickLeave() {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: (id: string) => deleteSickLeave(id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["sick-leaves"]}),
    });

    return {
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
