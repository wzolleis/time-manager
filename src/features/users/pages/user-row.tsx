import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button, buttonVariants} from "@/components/ui/button";
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
import {TableCell, TableRow} from "@/components/ui/table";
import {updateUser} from "@/api/users";
import type {User, UserUpdate} from "@shared/user";

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

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={deleting}>
                            {deleting ? "Lösche…" : "Löschen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{user.name} löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Der User wird dauerhaft aus der Datenbank entfernt. Das lässt sich
                                nicht rückgängig machen.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => onDelete(user)}
                            >
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>User bearbeiten</DialogTitle>
                                <DialogDescription>
                                    Änderungen gelten nach dem Speichern sofort.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-2 text-left">
                                <Label htmlFor={fieldId("name")}>Name</Label>
                                <Input
                                    id={fieldId("name")}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2 text-left">
                                <Label htmlFor={fieldId("email")}>E-Mail</Label>
                                <Input
                                    id={fieldId("email")}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2 text-left">
                                <Label htmlFor={fieldId("avatar")}>Avatar-URL (optional)</Label>
                                <Input
                                    id={fieldId("avatar")}
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://…"
                                />
                            </div>

                            {update.isError && (
                                <p role="alert" className="text-sm text-destructive">
                                    {update.error.message}
                                </p>
                            )}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Abbrechen
                                </Button>
                                <Button type="submit" disabled={update.isPending}>
                                    {update.isPending ? "Speichere…" : "Speichern"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </TableCell>
        </TableRow>
    );
}