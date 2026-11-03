import {formatDay} from "@shared/format";
import {SickLeaveDialog} from "@features/sick-leaves/components/sick-leave-dialog";
import type {SickLeave} from "@shared/sick-leave";
import {useDeleteSickLeave} from "@features/sick-leaves/use-cases/use-delete-sick-leave";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";
import {RowActions} from "@/components/table/row-actions";

export function SickLeaveActions({sickLeave}: {sickLeave: SickLeave}) {
    const remove = useDeleteSickLeave();

    return (
        <RowActions error={remove.error}>
            <SickLeaveDialog sickLeave={sickLeave} label="Bearbeiten" />

            <ConfirmDeleteButton
                title="Krankmeldung löschen?"
                description={
                    <>
                        Die Krankmeldung vom {formatDay(sickLeave.startDate)} bis {formatDay(sickLeave.endDate)} wird
                        dauerhaft entfernt. Buchungen an diesen Tagen zählen danach wieder zur Arbeitszeit.
                    </>
                }
                onConfirm={() => remove.remove(sickLeave)}
                onOpen={() => remove.reset()}
                pending={remove.isDeleting}
            />
        </RowActions>
    );
}
