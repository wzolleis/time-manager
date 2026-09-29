import {useQuery} from "@tanstack/react-query";
import {fetchUsers} from "@/api/users.ts";


export function UsersHome() {
    const {data: users, isPending, isError, error, refetch} = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });

    if (isPending) return <p>Lade…</p>;
    if (isError)
        return (
            <div>
                <p>{error.message}</p>
                <button onClick={() => refetch()}>Erneut versuchen</button>
            </div>
        );

    return (
        <ul>
            {users.map((u) => (
                <li key={u.id}>
                    <strong>{u.name}</strong> ({u.email})
                </li>
            ))}
        </ul>
    );
}