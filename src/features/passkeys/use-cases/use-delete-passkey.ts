import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deletePasskey} from "@/api/passkeys";

/** Der User löscht einen eigenen Passkey. Mit ihm ist danach keine Anmeldung mehr möglich. */
export function useDeletePasskey() {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: (id: string) => deletePasskey(id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["passkeys"]}),
    });

    return {
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
