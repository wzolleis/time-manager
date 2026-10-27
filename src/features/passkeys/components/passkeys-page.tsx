import {PasskeyAddDialog} from "@features/passkeys/components/passkey-add-dialog";
import {PasskeyList} from "@features/passkeys/components/passkey-list";
import {useShowPasskeys} from "@features/passkeys/use-cases/use-show-passkeys";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

export function PasskeysPage() {
    const passkeys = useShowPasskeys();

    return (
        <Page>
            <PageHeader
                title="Passkeys"
                description="Mit einem Passkey meldest du dich per Fingerabdruck, Gesicht oder Geräte-PIN an, ohne Passwort."
                actions={<PasskeyAddDialog />}
            />
            <PasskeyList passkeys={passkeys} />
        </Page>
    );
}
