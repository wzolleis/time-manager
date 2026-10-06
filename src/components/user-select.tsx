// src/components/user-select.tsx
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {useCurrentUser} from "@/lib/user-context";

export function UserSelect() {
    const {users, currentUser, setCurrentUserId, isPending, isError} = useCurrentUser();

    if (isPending) return <span className="text-sm text-muted-foreground">Lade User…</span>;
    if (isError) return <span className="text-sm text-destructive">User nicht ladbar</span>;
    if (users.length === 0) {
        return <span className="text-sm text-muted-foreground">Keine User vorhanden</span>;
    }

    return (
        <Select value={currentUser?.id} onValueChange={setCurrentUserId}>
            <SelectTrigger className="w-48" aria-label="User auswählen">
                <SelectValue placeholder="User wählen"/>
            </SelectTrigger>
            <SelectContent>
                {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                        {u.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}