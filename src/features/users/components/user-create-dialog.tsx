import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
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
import {createUser} from "@/api/users";
import type {UserCreate} from "@shared/user";
import {PASSWORD_MIN_LENGTH} from "@shared/auth";
import {ErrorText} from "@/components/text/error-text";

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        create.mutate({
            name,
            email,
            password,
            // Leeres Feld bedeutet "kein Avatar", die DB speichert dann NULL
            avatarUrl: avatarUrl === "" ? null : avatarUrl,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>Neuer User</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Neuen User anlegen</DialogTitle>
                        <DialogDescription>
                            Name, E-Mail und Passwort sind Pflicht, der Avatar ist optional. Das Passwort teilst du dem
                            User mit, er kann es danach selbst ändern.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="create-user-name">Name</Label>
                        <Input
                            id="create-user-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="create-user-email">E-Mail</Label>
                        <Input
                            id="create-user-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="create-user-password">Passwort</Label>
                        <Input
                            id="create-user-password"
                            type="password"
                            autoComplete="new-password"
                            minLength={PASSWORD_MIN_LENGTH}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="create-user-avatar">Avatar-URL (optional)</Label>
                        <Input
                            id="create-user-avatar"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://…"
                        />
                    </div>

                    {create.isError && <ErrorText>{create.error.message}</ErrorText>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={create.isPending}>
                            {create.isPending ? "Speichere…" : "Anlegen"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
