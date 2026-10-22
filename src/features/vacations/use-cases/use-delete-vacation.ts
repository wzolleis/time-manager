import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteVacation} from "@/api/vacations";
import type {Vacation} from "@shared/vacation";

/** Der User löscht einen Urlaub */
export function useDeleteVacation() {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: ({userId, id}: Pick<Vacation, "userId" | "id">) => deleteVacation(userId, id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["vacations"]}),
    });

    return {
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
