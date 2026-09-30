// ganz oben in der Datei ergänzen bzw. anpassen:
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {updateUser} from "@/api/users.ts";
import type {User} from "@shared/user.ts";

type UserRowProps = {
    user: User;
    onDelete: (id: string, name: string) => void;
    deleting: boolean;
};

export function UserRow({user, onDelete, deleting}: UserRowProps) {
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');

    const update = useMutation({
        mutationFn: (data: Parameters<typeof updateUser>[1]) => updateUser(user.id, data),
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["users"]});
            setEditing(false);
        },
    });

    const startEdit = () => {
        setName(user.name);
        setEmail(user.email);
        setAvatarUrl(user.avatarUrl ?? '');
        update.reset();
        setEditing(true);
    };

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        // Nur geänderte Felder senden. Eine leere Avatar-URL wird nicht gesendet,
        // weil der Server nur gültige URLs annimmt.
        const patch: Parameters<typeof updateUser>[1] = {};
        if (name !== user.name) patch.name = name;
        if (email !== user.email) patch.email = email;
        if (avatarUrl !== (user.avatarUrl ?? "")) {
            patch.avatarUrl = avatarUrl === "" ? null : avatarUrl;
        }

        if (Object.keys(patch).length === 0) {
            setEditing(false);
            return;
        }
        update.mutate(patch);
    };

    if (!editing) {
        return (
            <li>
                <strong>{user.name}</strong> ({user.email}){" "}
                <button onClick={startEdit}>Bearbeiten</button>
                {" "}
                <button onClick={() => onDelete(user.id, user.name)} disabled={deleting}>
                    Löschen
                </button>
            </li>
        );
    }

    return (
        <li>
            <form onSubmit={save}>
                <input value={name} onChange={(e) => setName(e.target.value)} required/>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Avatar-URL"
                />
                <button type="submit" disabled={update.isPending}>
                    {update.isPending ? "Speichere…" : "Speichern"}
                </button>
                {" "}
                <button type="button" onClick={() => setEditing(false)}>
                    Abbrechen
                </button>
                {update.isError && <p role="alert">{update.error.message}</p>}
            </form>
        </li>
    );
}