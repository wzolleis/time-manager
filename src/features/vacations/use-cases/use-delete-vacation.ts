import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteVacation} from "@/api/vacations";

/** Der User löscht einen Urlaub */
export function useDeleteVacation() {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: (id: string) => deleteVacation(id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["vacations"]}),
    });

    return {
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
