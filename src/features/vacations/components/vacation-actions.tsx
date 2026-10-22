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
import {VacationDialog} from "@features/vacations/components/vacation-dialog";
import {germanDay} from "@shared/vacation-rules";
import type {Vacation} from "@shared/vacation";
import {useDeleteVacation} from "@features/vacations/use-cases/use-delete-vacation";

export function VacationActions({vacation}: {vacation: Vacation}) {
    const remove = useDeleteVacation();

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <VacationDialog vacation={vacation} label="Bearbeiten" />

                <AlertDialog onOpenChange={(next) => next && remove.reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={remove.isDeleting}>
                            {remove.isDeleting ? "Lösche…" : "Löschen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Urlaub löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Der Urlaub vom {germanDay(vacation.startDate)} bis {germanDay(vacation.endDate)} wird
                                dauerhaft entfernt.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => remove.remove(vacation)}
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
