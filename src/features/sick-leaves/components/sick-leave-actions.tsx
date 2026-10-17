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
import {SickLeaveDialog} from "@features/sick-leaves/components/sick-leave-dialog";
import {germanDay} from "@shared/vacation-rules";
import type {SickLeave} from "@shared/sick-leave";
import {useDeleteSickLeave} from "@features/sick-leaves/use-cases/use-delete-sick-leave";

export function SickLeaveActions({sickLeave}: {sickLeave: SickLeave}) {
    const remove = useDeleteSickLeave();

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <SickLeaveDialog sickLeave={sickLeave} label="Bearbeiten" />

                <AlertDialog onOpenChange={(next) => next && remove.reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={remove.isDeleting}>
                            {remove.isDeleting ? "Lösche…" : "Löschen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Krankmeldung löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Die Krankmeldung vom {germanDay(sickLeave.startDate)} bis {germanDay(sickLeave.endDate)}{" "}
                                wird dauerhaft entfernt. Buchungen an diesen Tagen zählen danach wieder zur Arbeitszeit.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => remove.remove(sickLeave.id)}
                            >
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {remove.error && (
                <p role="alert" className="text-right text-sm text-destructive">
                    {remove.error.message}
                </p>
            )}
        </div>
    );
}
