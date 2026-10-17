import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTimeEntry} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {localTimeToUtc} from "@shared/day-range";

type Addition = {
    type: "kommen" | "gehen";
    day: string; // "JJJJ-MM-TT"
    time: string; // "HH:mm"
    projectId: string | null;
};

/** Der User trägt eine vergessene Buchung nach */
export function useAddTimeEntry() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: ({type, day, time, projectId}: Addition) =>
            createTimeEntry({
                userId: currentUser!.id,
                type,
                bookedAt: localTimeToUtc(day, time),
                projectId: type === "kommen" ? (projectId ?? undefined) : undefined,
            }),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    return {
        currentUser,
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
