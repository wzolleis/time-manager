import {HolidayDialog} from "@features/holidays/components/holiday-dialog";
import {useDeleteHoliday} from "@features/holidays/use-cases/use-delete-holiday";
import {germanDay} from "@shared/vacation-rules";
import type {Holiday} from "@shared/holiday";
import {ErrorText} from "@/components/text/error-text";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

export function HolidayActions({holiday, userName}: {holiday: Holiday; userName?: string}) {
    const {remove, isDeleting, error, reset} = useDeleteHoliday();

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <HolidayDialog holiday={holiday} userId={holiday.userId} userName={userName} label="Bearbeiten" />

                <ConfirmDeleteButton
                    title="Feiertag löschen?"
                    description={
                        <>
                            Der Feiertag „{holiday.name}“ am {germanDay(holiday.date)} wird dauerhaft entfernt.
                            {holiday.userId === null && " Er fehlt danach bei allen Usern."}
                        </>
                    }
                    onConfirm={() => remove(holiday)}
                    onOpen={() => reset()}
                    pending={isDeleting}
                />
            </div>

            {error && <ErrorText className="text-right">{error.message}</ErrorText>}
        </div>
    );
}
