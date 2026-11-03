import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {createUser} from "@/api/users";
import type {UserCreate} from "@shared/user";
import {PASSWORD_MIN_LENGTH} from "@shared/auth";
import {FormField} from "@/components/form/form-field";
import {FormDialog} from "@/components/form/form-dialog";

export function UserCreateDialog() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [password, setPassword] = useState("");

    const create = useMutation({
        mutationFn: (data: UserCreate) => createUser(data),
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["users"]});
            setOpen(false);
        },
    });

    // Beim Öffnen und Schließen leeres Formular und keine alte Fehlermeldung
    const handleOpenChange = (next: boolean) => {
        setName("");
        setEmail("");
        setAvatarUrl("");
        setPassword("");
        create.reset();
        setOpen(next);
    };

    const handleSubmit = () => {
        create.mutate({
            name,
            email,
            password,
            // Leeres Feld bedeutet "kein Avatar", die DB speichert dann NULL
            avatarUrl: avatarUrl === "" ? null : avatarUrl,
        });
    };

    return (
        <FormDialog
            title="Neuen User anlegen"
            description="Name, E-Mail und Passwort sind Pflicht, der Avatar ist optional. Das Passwort teilst du dem User mit, er kann es danach selbst ändern."
            open={open}
            onOpenChange={handleOpenChange}
            onSubmit={handleSubmit}
            saving={create.isPending}
            submitLabel="Anlegen"
            error={create.error}
            trigger={<Button>Neuer User</Button>}
        >
            <FormField label="Name" htmlFor="create-user-name">
                <Input
                    id="create-user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                />
            </FormField>

            <FormField label="E-Mail" htmlFor="create-user-email">
                <Input
                    id="create-user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </FormField>

            <FormField label="Passwort" htmlFor="create-user-password">
                <Input
                    id="create-user-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </FormField>

            <FormField label="Avatar-URL (optional)" htmlFor="create-user-avatar">
                <Input
                    id="create-user-avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://…"
                />
            </FormField>
        </FormDialog>
    );
}
