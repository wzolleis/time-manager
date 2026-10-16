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
} from "@/components/ui/alert-dialog.tsx";
import {Button, buttonVariants} from "@/components/ui/button.tsx";
import {HolidayDialog} from "@features/holidays/components/holiday-dialog.tsx";
import {deleteHoliday} from "@/api/holidays.ts";
import {germanDay} from "@shared/vacation-rules.ts";
import type {Holiday} from "@shared/holiday.ts";

export function HolidayActions({holiday, userName}: { holiday: Holiday; userName?: string }) {
    const qc = useQueryClient();

    const remove = useMutation({
        mutationFn: () => deleteHoliday(holiday.id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["holidays"]}),
    });

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <HolidayDialog holiday={holiday} userId={holiday.userId} userName={userName} label="Bearbeiten"/>

                <AlertDialog onOpenChange={(next) => next && remove.reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={remove.isPending}>
                            {remove.isPending ? "Lösche…" : "Löschen"}
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
