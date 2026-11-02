import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteTimeEntry, toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useTimeEntries} from "@/views/time-entries";
import {checkSequence} from "@shared/time-rules";
import {optimisticTimeEntries, withRemoved} from "@features/reports/time-entries-cache";

type Deletion = {id: string; pair: boolean}; // pair: das Gegenstück wird mit gelöscht

/** Der User löscht eine Buchung, auf Wunsch zusammen mit ihrem Gegenstück */
export function useDeleteTimeEntry() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge

    const remove = useMutation({
        mutationFn: ({id, pair}: Deletion) => deleteTimeEntry(currentUser!.id, id, pair),
        ...optimisticTimeEntries(qc, currentUser?.id, (list, {id, pair}: Deletion) => withRemoved(list, id, pair)),
    });

    /** Service, null = alles in Ordnung */
    const problem = ({id, pair}: Deletion) => checkSequence(withRemoved(entries.data ?? [], id, pair).map(toBooking));

    return {
        problem,
        remove: remove.mutate,
    };
}
