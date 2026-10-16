import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {deleteUser, fetchUsers} from "@/api/users";
import type {User} from "@shared/user";
import {UserCreateDialog} from "@features/users/pages/user-create-dialog";
import {UserTable} from "@features/users/pages/user-table";

export function Users() {
    const qc = useQueryClient();

    const {
        data: users,
        isPending,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });

    const remove = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => qc.invalidateQueries({queryKey: ["users"]}),
    });

    const handleDelete = (user: User) => remove.mutate(user.id);

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Benutzerverwaltung</h1>
                <UserCreateDialog />
            </div>

            {isPending && <p className="text-sm text-muted-foreground">Lade…</p>}

            {isError && (
                <div className="space-y-2">
                    <p role="alert" className="text-sm text-destructive">
                        {error.message}
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>
                        Erneut versuchen
                    </Button>
                </div>
            )}

            {users && (
                <UserTable
                    users={users}
                    onDelete={handleDelete}
                    deletingId={remove.isPending ? remove.variables : undefined}
                />
            )}

            {remove.isError && (
                <p role="alert" className="text-sm text-destructive">
                    {remove.error.message}
                </p>
            )}
        </div>
    );
}
