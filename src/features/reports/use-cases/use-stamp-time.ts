import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTimeEntry, toBooking} from "@/api/time-entries";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {useProjects} from "@/views/projects";
import {useSickLeaves} from "@/views/sick-leaves";
import {useTimeEntries} from "@/views/time-entries";
import {optimisticId, optimisticTimeEntries, withAdded} from "@features/reports/time-entries-cache";
import {isSickDay, sickDayMessage} from "@shared/sick-leave-rules";
import {findMissingGehen, localDay} from "@shared/time-rules";

type Stamp = {type: "kommen" | "gehen"; projectId: string | null};
type StampAt = Stamp & {bookedAt: Date}; // die Zeit einmal festlegen, für Cache und Server gleich

/** Der User stempelt sich mit Kommen ein oder mit Gehen aus */
export function useStampTime() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const now = useNow();
    const userId = currentUser?.id;

    const entries = useTimeEntries(userId);
    const projects = useProjects();
    const sickLeaves = useSickLeaves(userId);

    const save = useMutation({
        mutationFn: ({type, projectId, bookedAt}: StampAt) =>
            createTimeEntry(userId!, {
                type,
                bookedAt,
                projectId: type === "kommen" ? (projectId ?? undefined) : undefined,
            }),
        // Der neue Status erscheint sofort, ohne auf den Server zu warten
        ...optimisticTimeEntries(qc, userId, (list, {type, projectId, bookedAt}: StampAt) =>
            withAdded(list, {
                id: optimisticId(),
                userId: userId!,
                type,
                bookedAt: bookedAt.toISOString(),
                projectId: type === "kommen" ? projectId : null,
            }),
        ),
    });

    // Die API liefert die Buchungen nach Zeit sortiert, die letzte bestimmt den Status
    const last = entries.data?.at(-1);
    const isIn = last?.type === "kommen";
    const missing = entries.data ? findMissingGehen(entries.data.map(toBooking), new Date(now)) : null;
    const today = localDay(new Date(now));

    return {
        currentUser,
        now,
        last,
        isIn,
        missing, // Kommen eines vergangenen Tages ohne Gehen: erst nachtragen, dann wieder stempeln
        projectName: isIn ? projects.data?.find((p) => p.id === last.projectId)?.name : undefined,
        projects: projects.data,
        // Hinweis, wenn heute ein Krankheitstag ist: Stempeln geht, zählt aber nicht
        sickNotice: isSickDay(today, sickLeaves.data ?? []) ? sickDayMessage(today) : null,
        isPending: entries.isPending,
        isLoaded: entries.isSuccess,
        loadError: entries.error,
        stamp: (stamp: Stamp) => save.mutate({...stamp, bookedAt: new Date()}),
        // Stempeln geht schon, bevor die Buchungen geladen sind: dann ist es ein Kommen. Lehnt der Server ab
        // (z. B. weil der User schon eingestempelt ist), zeigt der Optimistic Write den Fehler.
        // isPending sperrt nur gegen Doppelklick, der neue Status steht schon im Cache.
        canStamp: !entries.error && !save.isPending,
    };
}
