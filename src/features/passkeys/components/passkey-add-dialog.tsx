import {useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useAddPasskey} from "@features/passkeys/use-cases/use-add-passkey";
import {FormDialog} from "@/components/form/form-dialog";
import {FormField} from "@/components/form/form-field";

export function PasskeyAddDialog() {
    const uid = useId();
    const add = useAddPasskey();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setName("");
            add.reset();
        }
        setOpen(next);
    };

    const problem = add.problem(name);

    return (
        <FormDialog
            title="Passkey hinzufügen"
            description="Danach fragt dein Browser nach Fingerabdruck, Gesicht oder Geräte-PIN und legt den Passkey an."
            open={open}
            onOpenChange={handleOpenChange}
            onSubmit={() => {
                if (problem) return;
                add.add(name, {onSuccess: () => setOpen(false)});
            }}
            saving={add.isSaving}
            disabled={problem !== null}
            submitLabel="Weiter"
            savingLabel="Lege an…"
            error={add.error}
            trigger={<Button>Passkey hinzufügen</Button>}
        >
            <FormField label="Name" htmlFor={`${uid}-name`}>
                <Input
                    id={`${uid}-name`}
                    value={name}
                    maxLength={100}
                    placeholder="z. B. MacBook"
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                />
            </FormField>
        </FormDialog>
    );
}
