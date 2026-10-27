import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {deleteUser, fetchUsers} from "@/api/users";
import type {User} from "@shared/user";
import {UserCreateDialog} from "@features/users/components/user-create-dialog";
import {UserTable} from "@features/users/components/user-table";
import {ErrorText} from "@/components/text/error-text";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";

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

            {isPending && <Loading />}

            {isError && <LoadError error={error} onRetry={() => refetch()} />}

            {users && (
                <UserTable
                    users={users}
                    onDelete={handleDelete}
                    deletingId={remove.isPending ? remove.variables : undefined}
                />
            )}

            {remove.isError && <ErrorText>{remove.error.message}</ErrorText>}
        </div>
    );
}
