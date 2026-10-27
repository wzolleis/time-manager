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
import {formatTime} from "@shared/format";
import type {EntryRow} from "@features/reports/time-entry-row";
import {useDeleteTimeEntry} from "@features/reports/use-cases/use-delete-time-entry";
import {ErrorText} from "@/components/text/error-text";

export const TimeEntryDelete = ({entry}: {entry: EntryRow}) => {
    const remove = useDeleteTimeEntry();
    const isKommen = entry.type === "kommen";
    const typeLabel = isKommen ? "Kommen" : "Gehen";
    const singleProblem = remove.problem({id: entry.id, pair: false});
    const pairProblem = remove.problem({id: entry.id, pair: true});

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
                            noch stimmen. Mit Gegenstück verschwindet zusätzlich{" "}
                            {isKommen ? "das folgende Gehen" : "das vorhergehende Kommen"}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {singleProblem && (
                        <ErrorText alert={false}>Nur diese Buchung zu löschen geht nicht: {singleProblem}</ErrorText>
                    )}
                    {pairProblem && (
                        <ErrorText alert={false}>Mit Gegenstück zu löschen geht nicht: {pairProblem}</ErrorText>
                    )}
                    <AlertDialogFooter className="flex-wrap">
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({variant: "outline", size: "sm"})}
                            disabled={singleProblem !== null}
                            onClick={() => remove.remove({id: entry.id, pair: false})}
                        >
                            Nur diese
                        </AlertDialogAction>
                        <AlertDialogAction
                            className={buttonVariants({variant: "destructive", size: "sm"})}
                            disabled={pairProblem !== null}
                            onClick={() => remove.remove({id: entry.id, pair: true})}
                        >
                            Mit Gegenstück
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {remove.error && <ErrorText className="text-right">{remove.error.message}</ErrorText>}
        </>
    );
};
