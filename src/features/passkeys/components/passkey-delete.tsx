import type {Passkey} from "@shared/passkey";
import {useDeletePasskey} from "@features/passkeys/use-cases/use-delete-passkey";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";
import {RowActions} from "@/components/table/row-actions";

export function PasskeyDelete({passkey}: {passkey: Passkey}) {
    const {remove, isDeleting, error, reset} = useDeletePasskey();

    return (
        <RowActions error={error}>
            <ConfirmDeleteButton
                title={<>Passkey „{passkey.name}“ löschen?</>}
                description="Mit diesem Passkey ist danach keine Anmeldung mehr möglich. Im Passwortmanager des Geräts bleibt er stehen, dort kannst du ihn selbst entfernen."
                onConfirm={() => remove(passkey.id)}
                onOpen={() => reset()}
                pending={isDeleting}
            />
        </RowActions>
    );
}
