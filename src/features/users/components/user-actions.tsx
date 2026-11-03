import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Input} from "@/components/ui/input";
import {deleteUser, updateUser} from "@/api/users";
import type {User, UserUpdate} from "@shared/user";
import {PasswordResetDialog} from "@features/users/components/password-reset-dialog";
import {UserRolesDialog} from "@features/users/components/user-roles-dialog";
import {FormField} from "@/components/form/form-field";
import {EditDialog} from "@/components/form/edit-dialog";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";
import {RowActions} from "@/components/table/row-actions";
import {EditButton} from "@/components/buttons/edit-button";

/** Aktionen je Zeile: User bearbeiten, Rollen und Passwort setzen oder löschen */
export function UserActions({user}: {user: User}) {
    const qc = useQueryClient();
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");

    const update = useMutation({
        mutationFn: (data: UserUpdate) => updateUser(user.id, data),
        onSuccess: () => qc.invalidateQueries({queryKey: ["users"]}),
    });

    const remove = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => qc.invalidateQueries({queryKey: ["users"]}),
    });

    // Beim Öffnen immer mit den gespeicherten Werten starten
    const reset = () => {
        setName(user.name);
        setEmail(user.email);
        setAvatarUrl(user.avatarUrl ?? "");
        update.reset();
    };

    const handleSubmit = (close: () => void) => {
        // Nur geänderte Felder senden; ein leeres Avatar-Feld entfernt den Avatar
        const patch: UserUpdate = {};
        if (name !== user.name) patch.name = name;
        if (email !== user.email) patch.email = email;
        if (avatarUrl !== (user.avatarUrl ?? "")) {
            patch.avatarUrl = avatarUrl === "" ? null : avatarUrl;
        }

        if (Object.keys(patch).length === 0) {
            close();
            return;
        }
        update.mutate(patch, {onSuccess: close});
    };

    const fieldId = (field: string) => `${field}-${user.id}`;

    return (
        <RowActions error={remove.error}>
            <EditDialog
                title="User bearbeiten"
                trigger={<EditButton />}
                onOpen={reset}
                onSubmit={handleSubmit}
                saving={update.isPending}
                error={update.error}
            >
                <FormField label="Name" htmlFor={fieldId("name")}>
                    <Input id={fieldId("name")} value={name} onChange={(e) => setName(e.target.value)} required />
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
            </EditDialog>
            <UserRolesDialog user={user} />
            <PasswordResetDialog user={user} />

            <ConfirmDeleteButton
                title={<>{user.name} löschen?</>}
                description="Der User wird dauerhaft aus der Datenbank entfernt. Das lässt sich nicht rückgängig machen."
                onConfirm={() => remove.mutate(user.id)}
                onOpen={() => remove.reset()}
                pending={remove.isPending}
            />
        </RowActions>
    );
}
