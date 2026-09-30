import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createUser, deleteUser, fetchUsers} from "@//api/users";
import {UserTable} from "@features/users/pages/user-table.tsx";
import type {User} from "@shared/user.ts";

export function UsersPage() {
    const qc = useQueryClient();
    const refresh = () => qc.invalidateQueries({queryKey: ["users"]});

    const {data: users, isPending, isError, error, refetch} = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });

    const create = useMutation({mutationFn: createUser, onSuccess: refresh});
    const remove = useMutation({mutationFn: deleteUser, onSuccess: refresh});

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        create.mutate(
            {name, email, avatarUrl: avatarUrl || ''},
            {
                onSuccess: () => {
                    setName("");
                    setEmail("");
                    setAvatarUrl("");
                },
            },
        );
    };

    // in UsersPage: handleDelete nimmt jetzt den ganzen User
    const handleDelete = (user: User) => {
        if (window.confirm(`${user.name} wirklich löschen?`)) remove.mutate(user.id);
    };

    return (
        <div>
            <h1>Users</h1>

            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="E-Mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    placeholder="Avatar-URL (optional)"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                />
                <button type="submit" disabled={create.isPending}>
                    {create.isPending ? "Speichere…" : "Anlegen"}
                </button>
                {create.isError && <p role="alert">{create.error.message}</p>}
            </form>

            {isPending && <p>Lade…</p>}
            {isError && (
                <div>
                    <p>{error.message}</p>
                    <button onClick={() => refetch()}>Erneut versuchen</button>
                </div>
            )}

            {users && (
                <UserTable users={users}
                           onDelete={handleDelete}
                           deletingId={remove.isPending ? remove.variables : undefined}/>
            )}
            {remove.isError && <p role="alert">{remove.error.message}</p>}
        </div>
    );
}