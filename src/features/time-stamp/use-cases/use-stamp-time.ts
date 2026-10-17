import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTimeEntry} from "@/api/time-entries";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useProjects} from "@/views/projects";
import {useTimeEntries} from "@/views/time-entries";
import {findMissingGehen} from "@shared/time-rules";

type Stamp = {type: "kommen" | "gehen"; projectId: string | null};

/** Der User stempelt sich mit Kommen ein oder mit Gehen aus */
export function useStampTime() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const now = useNow();
    const userId = currentUser?.id;

    const entries = useTimeEntries(userId);
    const projects = useProjects();

    const save = useMutation({
        mutationFn: ({type, projectId}: Stamp) =>
            createTimeEntry({
                userId: userId!,
                type,
                bookedAt: new Date(),
                projectId: type === "kommen" ? (projectId ?? undefined) : undefined,
            }),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    // Die API liefert die Buchungen nach Zeit sortiert, die letzte bestimmt den Status
    const last = entries.data?.at(-1);
    const isIn = last?.type === "kommen";
    const missing = entries.data
        ? findMissingGehen(
              entries.data.map((e) => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)})),
              new Date(now),
          )
        : null;

    return {
        currentUser,
        now,
        last,
        isIn,
        missing, // Kommen eines vergangenen Tages ohne Gehen: erst nachtragen, dann wieder stempeln
        projectName: isIn ? projects.data?.find((p) => p.id === last.projectId)?.name : undefined,
        projects: projects.data,
        isPending: entries.isPending,
        isLoaded: entries.isSuccess,
        loadError: entries.error,
        stamp: save.mutate,
        isStamping: save.isPending,
        error: save.error,
    };
}
