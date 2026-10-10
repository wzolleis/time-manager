import {Table, TableBody, TableHead, TableHeader, TableRow,} from "@/components/ui/table.tsx";
import {UserRow} from "@features/admin/users/pages/user-row.tsx";
import type {User} from "@shared/user.ts";

type UserTableProps = {
    users: User[];
    onDelete: (user: User) => void;
    deletingId?: string;
};

export function UserTable({users, onDelete, deletingId}: UserTableProps) {
    if (users.length === 0) {
        return <p className="text-sm text-muted-foreground">Keine User vorhanden.</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <UserRow
                            key={user.id}
                            user={user}
                            onDelete={onDelete}
                            deleting={deletingId === user.id}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}