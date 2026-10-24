import {useMutation, useQueryClient} from "@tanstack/react-query";
import {saveOvertime} from "@/api/overtime";
import {useCurrentUser} from "@/lib/user-context";
import {checkOffset, type OffsetParts, toOffset} from "@shared/overtime-rules";

/** Der User korrigiert seine Überstunden: er setzt den Korrekturwert absolut */
export function useChangeOvertime() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: (parts: OffsetParts) => saveOvertime(currentUser!.id, {offset: toOffset(parts)}),
        onSuccess: () => qc.invalidateQueries({queryKey: ["overtime"]}),
    });

    return {
        currentUser,
        // Service, null = alles in Ordnung. Mit den Auswahlfeldern immer gültig, der Server prüft noch einmal.
        problem: (parts: OffsetParts) => checkOffset(toOffset(parts)),
        change: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
