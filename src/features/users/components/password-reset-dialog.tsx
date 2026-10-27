import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
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
import {resetPassword} from "@/api/auth";
import {PASSWORD_MIN_LENGTH} from "@shared/auth";
import type {User} from "@shared/user";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";

// Der Admin setzt ein neues Passwort, ohne das alte zu kennen
export function PasswordResetDialog({user}: {user: User}) {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState("");

    const reset = useMutation({
        mutationFn: () => resetPassword({userId: user.id, password}),
        onSuccess: () => setOpen(false),
    });

    const handleOpenChange = (next: boolean) => {
        setPassword("");
        reset.reset();
        setOpen(next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        reset.mutate();
    };

    const fieldId = `reset-password-${user.id}`;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Passwort zurücksetzen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Passwort für {user.name} zurücksetzen</DialogTitle>
                        <DialogDescription>
                            Alle Anmeldungen von {user.name} werden beendet. Das neue Passwort teilst du dem User mit.
                        </DialogDescription>
                    </DialogHeader>

                    <FormField label="Neues Passwort" htmlFor={fieldId}>
                        <Input
                            id={fieldId}
                            type="password"
                            autoComplete="new-password"
                            minLength={PASSWORD_MIN_LENGTH}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoFocus
                        />
                    </FormField>

                    {reset.isError && <ErrorText>{reset.error.message}</ErrorText>}

                    <FormDialogFooter
                        onCancel={() => handleOpenChange(false)}
                        saving={reset.isPending}
                        submitLabel="Zurücksetzen"
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
}
