import type {Passkey} from "@shared/passkey";
import {useDeletePasskey} from "@features/passkeys/use-cases/use-delete-passkey";
import {ErrorText} from "@/components/text/error-text";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

export function PasskeyDelete({passkey}: {passkey: Passkey}) {
    const {remove, isDeleting, error, reset} = useDeletePasskey();

    return (
        <div className="space-y-1">
            <div className="flex justify-end">
                <ConfirmDeleteButton
                    title={<>Passkey „{passkey.name}“ löschen?</>}
                    description="Mit diesem Passkey ist danach keine Anmeldung mehr möglich. Im Passwortmanager des Geräts bleibt er stehen, dort kannst du ihn selbst entfernen."
                    onConfirm={() => remove(passkey.id)}
                    onOpen={() => reset()}
                    pending={isDeleting}
                />
            </div>

            {error && <ErrorText className="text-right">{error.message}</ErrorText>}
        </div>
    );
}
