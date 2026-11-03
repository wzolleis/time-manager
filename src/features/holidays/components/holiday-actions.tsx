import {formatDay} from "@shared/format";
import {HolidayDialog} from "@features/holidays/components/holiday-dialog";
import {useDeleteHoliday} from "@features/holidays/use-cases/use-delete-holiday";
import type {Holiday} from "@shared/holiday";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";
import {RowActions} from "@/components/table/row-actions";
import {EditButton} from "@/components/buttons/edit-button";

export function HolidayActions({holiday, userName}: {holiday: Holiday; userName?: string}) {
    const {remove, isDeleting, error, reset} = useDeleteHoliday();

    return (
        <RowActions error={error}>
            <HolidayDialog holiday={holiday} userId={holiday.userId} userName={userName} trigger={<EditButton />} />

            <ConfirmDeleteButton
                title="Feiertag löschen?"
                description={
                    <>
                        Der Feiertag „{holiday.name}“ am {formatDay(holiday.date)} wird dauerhaft entfernt.
                        {holiday.userId === null && " Er fehlt danach bei allen Usern."}
                    </>
                }
                onConfirm={() => remove(holiday)}
                onOpen={() => reset()}
                pending={isDeleting}
            />
        </RowActions>
    );
}
