import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {deleteUser, updateUser} from "@/api/users";
import type {User, UserUpdate} from "@shared/user";
import {PasswordResetDialog} from "@features/users/components/password-reset-dialog";
import {UserRolesDialog} from "@features/users/components/user-roles-dialog";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

/** Aktionen je Zeile: User bearbeiten, Rollen und Passwort setzen oder löschen */
export function UserActions({user}: {user: User}) {
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

    const remove = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => qc.invalidateQueries({queryKey: ["users"]}),
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
        <div className="space-y-1">
            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                    Bearbeiten
                </Button>
                <UserRolesDialog user={user} />
                <PasswordResetDialog user={user} />

                <ConfirmDeleteButton
                    title={<>{user.name} löschen?</>}
                    description="Der User wird dauerhaft aus der Datenbank entfernt. Das lässt sich nicht rückgängig machen."
                    onConfirm={() => remove.mutate(user.id)}
                    onOpen={() => remove.reset()}
                    pending={remove.isPending}
                />
            </div>

            {remove.isError && <ErrorText className="text-right">{remove.error.message}</ErrorText>}

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
        </div>
    );
}
