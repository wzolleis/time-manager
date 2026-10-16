import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
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
import {fetchRoles, fetchUserRoles, updateUserRoles} from "@/api/roles";
import type {User} from "@shared/user";

// Der Admin legt fest, welche Rollen ein User hat
export function UserRolesDialog({user}: { user: User }) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    // null: noch nichts geändert, dann gelten die gespeicherten Rollen
    const [selected, setSelected] = useState<string[] | null>(null);

    const roles = useQuery({queryKey: ["roles"], queryFn: fetchRoles, enabled: open});
    const userRoles = useQuery({
        queryKey: ["users", user.id, "roles"],
        queryFn: () => fetchUserRoles(user.id),
        enabled: open,
    });

    const save = useMutation({
        mutationFn: (next: string[]) => updateUserRoles(user.id, next),
        onSuccess: (saved) => {
            qc.setQueryData(["users", user.id, "roles"], saved);
            setOpen(false);
        },
    });

    const current = selected ?? userRoles.data?.map((r) => r.id) ?? [];

    const handleOpenChange = (next: boolean) => {
        setSelected(null);
        save.reset();
        setOpen(next);
    };

    const toggle = (roleId: string, checked: boolean) =>
        setSelected(checked ? [...current, roleId] : current.filter((id) => id !== roleId));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        save.mutate(current);
    };

    const loadError = roles.error ?? userRoles.error;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Rollen</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Rollen von {user.name}</DialogTitle>
                        <DialogDescription>
                            Ein Administrator darf alles. Es muss immer mindestens einen Administrator geben.
                        </DialogDescription>
                    </DialogHeader>

                    {(roles.isPending || userRoles.isPending) && !loadError && (
                        <p className="text-sm text-muted-foreground">Lade…</p>
                    )}

                    {roles.data && userRoles.data && (
                        <fieldset className="space-y-2 text-left">
                            <legend className="sr-only">Rollen</legend>
                            {roles.data.map((role) => (
                                <label key={role.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={current.includes(role.id)}
                                        onChange={(e) => toggle(role.id, e.target.checked)}
                                    />
                                    {role.name}
                                </label>
                            ))}
                        </fieldset>
                    )}

                    {(loadError ?? save.error) && (
                        <p role="alert" className="text-sm text-destructive">
                            {(loadError ?? save.error)?.message}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={save.isPending || !userRoles.data}>
                            {save.isPending ? "Speichere…" : "Speichern"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
