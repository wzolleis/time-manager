import {useId, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useAddPasskey} from "@features/passkeys/use-cases/use-add-passkey";
import {ErrorText} from "@/components/text/error-text";

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

                    <div className="space-y-2 text-left">
                        <Label htmlFor={`${uid}-name`}>Name</Label>
                        <Input
                            id={`${uid}-name`}
                            value={name}
                            maxLength={100}
                            placeholder="z. B. MacBook"
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    {add.error && <ErrorText>{add.error.message}</ErrorText>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={add.isSaving || problem !== null}>
                            {add.isSaving ? "Lege an…" : "Weiter"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
