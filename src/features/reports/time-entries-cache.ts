import type {QueryClient} from "@tanstack/react-query";
import {type TimeEntryDto, toBooking} from "@/api/time-entries";
import {findPartner} from "@shared/time-rules";
import {notifyError} from "@/lib/notify";

// Optimistic Write für Buchungen (Skill performance, features/changes/optimistic-write-time-entries.md):
// Die Änderung steht sofort im Cache, der Server bestätigt sie danach.

type Entries = TimeEntryDto[];

const OPTIMISTIC = "optimistic-";

/** Vorläufige Id einer neuen Buchung, bis der Server die echte liefert */
export const optimisticId = () => OPTIMISTIC + crypto.randomUUID();

/** Vorläufige Buchungen lassen sich nicht ändern oder löschen, der Server kennt ihre Id nicht */
export const isOptimistic = (id: string) => id.startsWith(OPTIMISTIC);

// Wie die API: nach Zeit sortiert. ISO-Strings aus toISOString lassen sich als Text vergleichen.
const byTime = (list: Entries) => list.toSorted((a, b) => a.bookedAt.localeCompare(b.bookedAt));

/** Buchungen mit einer neuen Buchung */
export const withAdded = (entries: Entries, added: TimeEntryDto): Entries => byTime([...entries, added]);

/** Buchungen mit geänderter Uhrzeit oder geändertem Projekt einer Buchung */
export const withChanged = (
    entries: Entries,
    id: string,
    patch: {bookedAt?: string; projectId?: string | null},
): Entries => byTime(entries.map((e) => (e.id === id ? {...e, ...patch} : e)));

/** Buchungen ohne die gelöschte, mit pair auch ohne ihr Gegenstück */
export const withRemoved = (entries: Entries, id: string, pair: boolean): Entries => {
    const partner = pair ? findPartner(entries.map(toBooking), id) : null;
    return entries.filter((e) => e.id !== id && e.id !== partner?.id);
};

/**
 * Optionen für useMutation: onMutate setzt den neuen Stand in den Cache, onError stellt den alten wieder her
 * und zeigt den Fehler als Toast (der Dialog ist dann schon zu), onSettled lädt die Buchungen neu.
 */
export function optimisticTimeEntries<T>(
    qc: QueryClient,
    userId: string | undefined,
    apply: (entries: Entries, input: T) => Entries,
) {
    const key = ["time-entries", userId];
    return {
        mutationKey: ["time-entries"],
        onMutate: async (input: T) => {
            await qc.cancelQueries({queryKey: key});
            const previous = qc.getQueryData<Entries>(key);
            if (previous) qc.setQueryData<Entries>(key, apply(previous, input));
            return {previous};
        },
        onError: (err: Error, _input: T, ctx: {previous?: Entries} | undefined) => {
            if (ctx?.previous) qc.setQueryData(key, ctx.previous);
            notifyError(err.message);
        },
        onSettled: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    };
}
