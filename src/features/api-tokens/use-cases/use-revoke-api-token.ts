import {useMutation, useQueryClient} from "@tanstack/react-query";
import {revokeApiToken} from "@/api/api-tokens";

/** Der User widerruft ein eigenes Agent-Token. Der Agent wird danach sofort abgelehnt. */
export function useRevokeApiToken() {
    const qc = useQueryClient();

    const revoke = useMutation({
        mutationFn: (id: string) => revokeApiToken(id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["api-tokens"]}),
    });

    return {
        revoke: revoke.mutate,
        isRevoking: revoke.isPending,
        error: revoke.error,
        reset: revoke.reset,
    };
}
