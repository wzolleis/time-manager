import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {Input} from "@/components/ui/input";
import {resetPassword} from "@/api/auth";
import {PASSWORD_MIN_LENGTH} from "@shared/auth";
import type {User} from "@shared/user";
import {FormField} from "@/components/form/form-field";
import {FormDialog} from "@/components/form/form-dialog";
import {KeyRound} from "lucide-react";
import {ActionButton} from "@/components/buttons/action-button";

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

    const handleSubmit = () => {
        reset.mutate();
    };

    const fieldId = `reset-password-${user.id}`;

    return (
        <FormDialog
            title={<>Passwort für {user.name} zurücksetzen</>}
            description={
                <>Alle Anmeldungen von {user.name} werden beendet. Das neue Passwort teilst du dem User mit.</>
            }
            open={open}
            onOpenChange={handleOpenChange}
            onSubmit={handleSubmit}
            saving={reset.isPending}
            submitLabel="Zurücksetzen"
            error={reset.error}
            trigger={<ActionButton icon={KeyRound} label="Passwort zurücksetzen" variant="outline" />}
        >
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
        </FormDialog>
    );
}
