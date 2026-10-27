import {useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {useAddPasskey} from "@features/passkeys/use-cases/use-add-passkey";
import {ErrorText} from "@/components/text/error-text";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>Passkey hinzufügen</Button>
            </DialogTrigger>
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (problem) return;
                        add.add(name, {onSuccess: () => setOpen(false)});
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>Passkey hinzufügen</DialogTitle>
                        <DialogDescription>
                            Danach fragt dein Browser nach Fingerabdruck, Gesicht oder Geräte-PIN und legt den Passkey
                            an.
                        </DialogDescription>
                    </DialogHeader>

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

                    {add.error && <ErrorText>{add.error.message}</ErrorText>}

                    <FormDialogFooter
                        onCancel={() => setOpen(false)}
                        saving={add.isSaving}
                        disabled={problem !== null}
                        submitLabel="Weiter"
                        savingLabel="Lege an…"
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
}
