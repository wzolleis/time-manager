// src/features/auth/components/password-change-dialog.tsx
import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {changePassword} from "@/api/auth";
import {PASSWORD_MIN_LENGTH, type PasswordChange} from "@shared/auth";
import {ErrorText} from "@/components/text/error-text";

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== repeat) return;
        change.mutate({oldPassword, newPassword});
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Passwort ändern</DialogTitle>
                        <DialogDescription>
                            Andere Anmeldungen mit diesem Konto werden danach beendet.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="password-old">Bisheriges Passwort</Label>
                        <Input
                            id="password-old"
                            type="password"
                            autoComplete="current-password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password-new">Neues Passwort</Label>
                        <Input
                            id="password-new"
                            type="password"
                            autoComplete="new-password"
                            minLength={PASSWORD_MIN_LENGTH}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password-repeat">Neues Passwort wiederholen</Label>
                        <Input
                            id="password-repeat"
                            type="password"
                            autoComplete="new-password"
                            value={repeat}
                            onChange={(e) => setRepeat(e.target.value)}
                            aria-invalid={mismatch}
                            required
                        />
                    </div>

                    {mismatch && <ErrorText>Die Passwörter stimmen nicht überein</ErrorText>}
                    {change.isError && <ErrorText>{change.error.message}</ErrorText>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={change.isPending || mismatch}>
                            {change.isPending ? "Speichere…" : "Passwort ändern"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
