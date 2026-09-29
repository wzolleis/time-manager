import type {User} from "../../shared/user";

export async function fetchUsers(): Promise<User[]> {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error(`Fehler beim Laden (HTTP ${res.status})`);
    return res.json();
}