import {useMutation, useQueryClient} from "@tanstack/react-query";
import {revokeAnyApiToken} from "@/api/api-tokens";

/** Der Administrator widerruft das Agent-Token eines beliebigen Users */
export function useRevokeAnyApiToken() {
    const qc = useQueryClient();

    const revoke = useMutation({
        mutationFn: (id: string) => revokeAnyApiToken(id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["api-tokens"]}),
    });

    return {
        revoke: revoke.mutate,
        isRevoking: revoke.isPending,
        error: revoke.error,
        reset: revoke.reset,
    };
}
