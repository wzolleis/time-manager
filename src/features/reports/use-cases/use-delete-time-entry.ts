import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteTimeEntry, toBooking} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useTimeEntries} from "@/views/time-entries";
import {checkSequence, findPartner} from "@shared/time-rules";

type Deletion = {id: string; pair: boolean}; // pair: das Gegenstück wird mit gelöscht

/** Der User löscht eine Buchung, auf Wunsch zusammen mit ihrem Gegenstück */
export function useDeleteTimeEntry() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const entries = useTimeEntries(currentUser?.id); // für die Prüfung der Abfolge

    const remove = useMutation({
        mutationFn: ({id, pair}: Deletion) => deleteTimeEntry(id, pair),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    /** Service, null = alles in Ordnung */
    const problem = ({id, pair}: Deletion) => {
        const bookings = (entries.data ?? []).map(toBooking);
        const partner = pair ? findPartner(bookings, id) : null;
        return checkSequence(bookings.filter((b) => b.id !== id && b.id !== partner?.id));
    };

    return {
        problem,
        remove: remove.mutate,
        isDeleting: remove.isPending,
        error: remove.error,
        reset: remove.reset,
    };
}
