// src/features/auth/components/password-change-dialog.tsx
import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {Input} from "@/components/ui/input";
import {changePassword} from "@/api/auth";
import {PASSWORD_MIN_LENGTH, type PasswordChange} from "@shared/auth";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";
import {FormDialog} from "@/components/form/form-dialog";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

// Eigenes Passwort ändern: das bisherige Passwort ist Pflicht
export function PasswordChangeDialog({open, onOpenChange}: Props) {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeat, setRepeat] = useState("");

    const change = useMutation({
        mutationFn: (data: PasswordChange) => changePassword(data),
        onSuccess: () => onOpenChange(false),
    });

    // Beim Öffnen und Schließen leeres Formular und keine alte Fehlermeldung
    const handleOpenChange = (next: boolean) => {
        setOldPassword("");
        setNewPassword("");
        setRepeat("");
        change.reset();
        onOpenChange(next);
    };

    const mismatch = repeat !== "" && repeat !== newPassword;

    const handleSubmit = () => {
        if (newPassword !== repeat) return;
        change.mutate({oldPassword, newPassword});
    };

    return (
        <FormDialog
            title="Passwort ändern"
            description="Andere Anmeldungen mit diesem Konto werden danach beendet."
            open={open}
            onOpenChange={handleOpenChange}
            onSubmit={handleSubmit}
            saving={change.isPending}
            error={change.error}
            disabled={mismatch}
            submitLabel="Passwort ändern"
        >
            <FormField label="Bisheriges Passwort" htmlFor="password-old">
                <Input
                    id="password-old"
                    type="password"
                    autoComplete="current-password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    autoFocus
                />
            </FormField>

            <FormField label="Neues Passwort" htmlFor="password-new">
                <Input
                    id="password-new"
                    type="password"
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
            </FormField>

            <FormField label="Neues Passwort wiederholen" htmlFor="password-repeat">
                <Input
                    id="password-repeat"
                    type="password"
                    autoComplete="new-password"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    aria-invalid={mismatch}
                    required
                />
            </FormField>

            {mismatch && <ErrorText>Die Passwörter stimmen nicht überein</ErrorText>}
        </FormDialog>
    );
}
