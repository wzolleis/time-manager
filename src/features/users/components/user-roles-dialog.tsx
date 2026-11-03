import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {fetchRoles, fetchUserRoles, updateUserRoles} from "@/api/roles";
import type {User} from "@shared/user";
import {ErrorText} from "@/components/text/error-text";
import {Loading} from "@/components/text/loading";
import {FormDialog} from "@/components/form/form-dialog";
import {ShieldCheck} from "lucide-react";
import {ActionButton} from "@/components/buttons/action-button";

// Der Admin legt fest, welche Rollen ein User hat
export function UserRolesDialog({user}: {user: User}) {
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
        onSuccess: (saved) => qc.setQueryData(["users", user.id, "roles"], saved),
    });

    const current = selected ?? userRoles.data?.map((r) => r.id) ?? [];

    // Beim Öffnen die gespeicherten Rollen und keine alte Fehlermeldung
    const reset = () => {
        setSelected(null);
        save.reset();
    };

    const toggle = (roleId: string, checked: boolean) =>
        setSelected(checked ? [...current, roleId] : current.filter((id) => id !== roleId));

    const handleSubmit = (close: () => void) => {
        save.mutate(current, {onSuccess: close});
    };

    const loadError = roles.error ?? userRoles.error;

    return (
        <FormDialog
            title={<>Rollen von {user.name}</>}
            description="Ein Administrator darf alles. Es muss immer mindestens einen Administrator geben."
            // open bleibt hier gesteuert: die Rollen werden erst geladen, wenn der Dialog offen ist
            open={open}
            onOpenChange={setOpen}
            onOpen={reset}
            onSubmit={handleSubmit}
            saving={save.isPending}
            disabled={!userRoles.data}
            trigger={<ActionButton icon={ShieldCheck} label="Rollen" variant="outline" />}
        >
            {(roles.isPending || userRoles.isPending) && !loadError && <Loading />}

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

            {(loadError ?? save.error) && <ErrorText>{(loadError ?? save.error)?.message}</ErrorText>}
        </FormDialog>
    );
}
