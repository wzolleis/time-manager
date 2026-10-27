import {useMutation, useQueryClient} from "@tanstack/react-query";
import {startRegistration} from "@simplewebauthn/browser";
import {fetchPasskeyRegisterOptions, registerPasskey} from "@/api/passkeys";
import {passkeyError} from "@/lib/passkey-error";
import {PasskeyNameSchema} from "@shared/passkey";

/** null = gültig, sonst eine Fehlermeldung */
const checkName = (name: string): string | null => PasskeyNameSchema.safeParse(name).error?.issues[0].message ?? null;

/**
 * Der User trägt einen Passkey ein: Optionen vom Server holen, im Dialog des Browsers den Passkey anlegen,
 * die Antwort des Browsers vom Server prüfen und speichern lassen.
 */
export function useAddPasskey() {
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: async (name: string) => {
            const optionsJSON = await fetchPasskeyRegisterOptions();
            let response;
            try {
                response = await startRegistration({optionsJSON});
            } catch (err) {
                throw passkeyError(err, "Passkey hinzufügen abgebrochen");
            }
            return registerPasskey({name: name.trim(), response});
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ["passkeys"]}),
    });

    return {
        problem: checkName, // Service, null = alles in Ordnung
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
        reset: save.reset,
    };
}
