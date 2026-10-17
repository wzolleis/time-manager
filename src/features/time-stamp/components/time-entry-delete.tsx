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
import type {EntryRow} from "@features/time-stamp/time-entry-row";
import {useDeleteTimeEntry} from "@features/time-stamp/use-cases/use-delete-time-entry";

export const TimeEntryDelete = ({entry}: {entry: EntryRow}) => {
    const remove = useDeleteTimeEntry();
    const isKommen = entry.type === "kommen";
    const typeLabel = isKommen ? "Kommen" : "Gehen";

    return (
        <>
            <AlertDialog onOpenChange={(next) => next && remove.reset()}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={remove.isDeleting}>
                        {remove.isDeleting ? "Lösche…" : "Löschen"}
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
                            onClick={() => remove.remove({id: entry.id, pair: false})}
                        >
                            Nur diese
                        </AlertDialogAction>
                        <AlertDialogAction
                            className={buttonVariants({variant: "destructive", size: "sm"})}
                            onClick={() => remove.remove({id: entry.id, pair: true})}
                        >
                            Mit Gegenstück
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {remove.error && (
                <p role="alert" className="text-right text-sm text-destructive">
                    {remove.error.message}
                </p>
            )}
        </>
    );
};
