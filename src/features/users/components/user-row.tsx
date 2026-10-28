import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {TableCell, TableRow} from "@/components/ui/table";
import {updateUser} from "@/api/users";
import type {User, UserUpdate} from "@shared/user";
import {PasswordResetDialog} from "@features/users/components/password-reset-dialog";
import {UserRolesDialog} from "@features/users/components/user-roles-dialog";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

type UserRowProps = {
    user: User;
    onDelete: (user: User) => void;
    deleting: boolean;
};

export function UserRow({user, onDelete, deleting}: UserRowProps) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");

    const update = useMutation({
        mutationFn: (data: UserUpdate) => updateUser(user.id, data),
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["users"]});
            setOpen(false);
        },
    });

    // Beim Öffnen immer mit den gespeicherten Werten starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setName(user.name);
            setEmail(user.email);
            setAvatarUrl(user.avatarUrl ?? "");
            update.reset();
        }
        setOpen(next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Nur geänderte Felder senden; ein leeres Avatar-Feld entfernt den Avatar
        const patch: UserUpdate = {};
        if (name !== user.name) patch.name = name;
        if (email !== user.email) patch.email = email;
        if (avatarUrl !== (user.avatarUrl ?? "")) {
            patch.avatarUrl = avatarUrl === "" ? null : avatarUrl;
        }

        if (Object.keys(patch).length === 0) {
            setOpen(false);
            return;
        }
        update.mutate(patch);
    };

    const fieldId = (field: string) => `${field}-${user.id}`;

    return (
        <TableRow>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="space-x-2 text-right">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                    Bearbeiten
                </Button>
                <UserRolesDialog user={user} />
                <PasswordResetDialog user={user} />

                <ConfirmDeleteButton
                    title={<>{user.name} löschen?</>}
                    description="Der User wird dauerhaft aus der Datenbank entfernt. Das lässt sich nicht rückgängig machen."
                    onConfirm={() => onDelete(user)}
                    pending={deleting}
                />

                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>User bearbeiten</DialogTitle>
                                <DialogDescription>Änderungen gelten nach dem Speichern sofort.</DialogDescription>
                            </DialogHeader>

                            <FormField label="Name" htmlFor={fieldId("name")}>
                                <Input
                                    id={fieldId("name")}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </FormField>

                            <FormField label="E-Mail" htmlFor={fieldId("email")}>
                                <Input
                                    id={fieldId("email")}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </FormField>

                            <FormField label="Avatar-URL (optional)" htmlFor={fieldId("avatar")}>
                                <Input
                                    id={fieldId("avatar")}
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://…"
                                />
                            </FormField>

                            {update.isError && <ErrorText>{update.error.message}</ErrorText>}

                            <FormDialogFooter onCancel={() => setOpen(false)} saving={update.isPending} />
                        </form>
                    </DialogContent>
                </Dialog>
            </TableCell>
        </TableRow>
    );
}
