import {VacationDialog} from "@features/vacations/components/vacation-dialog";
import {germanDay} from "@shared/vacation-rules";
import type {Vacation} from "@shared/vacation";
import {useDeleteVacation} from "@features/vacations/use-cases/use-delete-vacation";
import {ErrorText} from "@/components/text/error-text";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

export function VacationActions({vacation}: {vacation: Vacation}) {
    const remove = useDeleteVacation();

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <VacationDialog vacation={vacation} label="Bearbeiten" />

                <ConfirmDeleteButton
                    title="Urlaub löschen?"
                    description={
                        <>
                            Der Urlaub vom {germanDay(vacation.startDate)} bis {germanDay(vacation.endDate)} wird
                            dauerhaft entfernt.
                        </>
                    }
                    onConfirm={() => remove.remove(vacation)}
                    onOpen={() => remove.reset()}
                    pending={remove.isDeleting}
                />
            </div>

            {remove.error && <ErrorText className="text-right">{remove.error.message}</ErrorText>}
        </div>
    );
}
