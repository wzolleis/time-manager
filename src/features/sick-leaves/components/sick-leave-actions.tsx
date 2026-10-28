import {SickLeaveDialog} from "@features/sick-leaves/components/sick-leave-dialog";
import {germanDay} from "@shared/vacation-rules";
import type {SickLeave} from "@shared/sick-leave";
import {useDeleteSickLeave} from "@features/sick-leaves/use-cases/use-delete-sick-leave";
import {ErrorText} from "@/components/text/error-text";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

export function SickLeaveActions({sickLeave}: {sickLeave: SickLeave}) {
    const remove = useDeleteSickLeave();

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <SickLeaveDialog sickLeave={sickLeave} label="Bearbeiten" />

                <ConfirmDeleteButton
                    title="Krankmeldung löschen?"
                    description={
                        <>
                            Die Krankmeldung vom {germanDay(sickLeave.startDate)} bis {germanDay(sickLeave.endDate)}{" "}
                            wird dauerhaft entfernt. Buchungen an diesen Tagen zählen danach wieder zur Arbeitszeit.
                        </>
                    }
                    onConfirm={() => remove.remove(sickLeave)}
                    onOpen={() => remove.reset()}
                    pending={remove.isDeleting}
                />
            </div>

            {remove.error && <ErrorText className="text-right">{remove.error.message}</ErrorText>}
        </div>
    );
}
