import {formatDay} from "@shared/format";
import {VacationDialog} from "@features/vacations/components/vacation-dialog";
import type {Vacation} from "@shared/vacation";
import {useDeleteVacation} from "@features/vacations/use-cases/use-delete-vacation";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";
import {RowActions} from "@/components/table/row-actions";
import {EditButton} from "@/components/buttons/edit-button";

export function VacationActions({vacation}: {vacation: Vacation}) {
    const remove = useDeleteVacation();

    return (
        <RowActions error={remove.error}>
            <VacationDialog vacation={vacation} trigger={<EditButton />} />

            <ConfirmDeleteButton
                title="Urlaub löschen?"
                description={
                    <>
                        Der Urlaub vom {formatDay(vacation.startDate)} bis {formatDay(vacation.endDate)} wird dauerhaft
                        entfernt.
                    </>
                }
                onConfirm={() => remove.remove(vacation)}
                onOpen={() => remove.reset()}
                pending={remove.isDeleting}
            />
        </RowActions>
    );
}
