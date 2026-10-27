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
import {HolidayDialog} from "@features/holidays/components/holiday-dialog";
import {useDeleteHoliday} from "@features/holidays/use-cases/use-delete-holiday";
import {germanDay} from "@shared/vacation-rules";
import type {Holiday} from "@shared/holiday";
import {ErrorText} from "@/components/text/error-text";

export function HolidayActions({holiday, userName}: {holiday: Holiday; userName?: string}) {
    const {remove, isDeleting, error, reset} = useDeleteHoliday();

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <HolidayDialog holiday={holiday} userId={holiday.userId} userName={userName} label="Bearbeiten" />

                <AlertDialog onOpenChange={(next) => next && reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDeleting}>
                            {isDeleting ? "Lösche…" : "Löschen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Feiertag löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Der Feiertag „{holiday.name}“ am {germanDay(holiday.date)} wird dauerhaft entfernt.
                                {holiday.userId === null && " Er fehlt danach bei allen Usern."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => remove(holiday)}
                            >
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {error && <ErrorText className="text-right">{error.message}</ErrorText>}
        </div>
    );
}
