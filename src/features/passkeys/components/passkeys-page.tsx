import {PasskeyAddDialog} from "@features/passkeys/components/passkey-add-dialog";
import {PasskeyList} from "@features/passkeys/components/passkey-list";
import {useShowPasskeys} from "@features/passkeys/use-cases/use-show-passkeys";
import {Muted} from "@/components/text/muted";

export function PasskeysPage() {
    const passkeys = useShowPasskeys();

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Passkeys</h1>
                    <Muted>
                        Mit einem Passkey meldest du dich per Fingerabdruck, Gesicht oder Geräte-PIN an, ohne Passwort.
                    </Muted>
                </div>
                <PasskeyAddDialog />
            </div>
            <PasskeyList passkeys={passkeys} />
        </div>
    );
}
