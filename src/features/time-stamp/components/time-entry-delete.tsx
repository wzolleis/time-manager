import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button, buttonVariants} from "@/components/ui/button";
import {formatTime} from "@/lib/format";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {deleteTimeEntry} from "@/api/time-entries";
import type {EntryRow} from "@features/time-stamp/time-entry-row";

export const TimeEntryDelete = ({entry}: {entry: EntryRow}) => {
    const qc = useQueryClient();
    const refresh = () => qc.invalidateQueries({queryKey: ["time-entries"]});
    const isKommen = entry.type === "kommen";
    const typeLabel = isKommen ? "Kommen" : "Gehen";

    const remove = useMutation({
        mutationFn: (pair: boolean) => deleteTimeEntry(entry.id, pair),
        onSuccess: refresh,
    });

    return (
        <>
            <AlertDialog onOpenChange={(next) => next && remove.reset()}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={remove.isPending}>
                        {remove.isPending ? "Lösche…" : "Löschen"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {typeLabel} um {formatTime(entry.bookedAt)} Uhr löschen?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Kommen und Gehen gehören zusammen. Löschst du nur diese Buchung, muss die Abfolge danach
                            noch stimmen, sonst lehnt der Server das ab. Mit Gegenstück verschwindet zusätzlich{" "}
                            {isKommen ? "das folgende Gehen" : "das vorhergehende Kommen"}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-wrap">
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({variant: "outline", size: "sm"})}
                            onClick={() => remove.mutate(false)}
                        >
                            Nur diese
                        </AlertDialogAction>
                        <AlertDialogAction
                            className={buttonVariants({variant: "destructive", size: "sm"})}
                            onClick={() => remove.mutate(true)}
                        >
                            Mit Gegenstück
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {remove.isError && (
                <p role="alert" className="text-right text-sm text-destructive">
                    {remove.error.message}
                </p>
            )}
        </>
    );
};
