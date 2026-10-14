import {useMutation, useQueryClient} from "@tanstack/react-query";
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
import {VacationDialog} from "@/features/user/vacations/components/vacation-dialog";
import {deleteVacation} from "@/api/vacations";
import {germanDay} from "@shared/vacation-rules";
import type {Vacation} from "@shared/vacation";

export function VacationActions({vacation}: { vacation: Vacation }) {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: () => deleteVacation(vacation.id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["vacations"]}),
    });

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <VacationDialog vacation={vacation} label="Bearbeiten"/>

                <AlertDialog onOpenChange={(next) => next && remove.reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={remove.isPending}>
                            {remove.isPending ? "Lösche…" : "Löschen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Urlaub löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Der Urlaub vom {germanDay(vacation.startDate)} bis{" "}
                                {germanDay(vacation.endDate)} wird dauerhaft entfernt.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => remove.mutate()}
                            >
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {remove.isError && (
                <p role="alert" className="text-right text-sm text-destructive">
                    {remove.error.message}
                </p>
            )}
        </div>
    );
}