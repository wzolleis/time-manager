import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createApiToken} from "@/api/api-tokens";
import type {ApiTokenCreate} from "@shared/api-token";
import {checkTokenName} from "@shared/api-token-rules";

/** Der User erzeugt ein Agent-Token. Das Token selbst steht nur in der Antwort (created). */
export function useCreateApiToken() {
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: (data: ApiTokenCreate) => createApiToken(data),
        onSuccess: () => qc.invalidateQueries({queryKey: ["api-tokens"]}),
    });

    return {
        problem: checkTokenName, // Service, null = alles in Ordnung
        create: save.mutate,
        created: save.data,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
