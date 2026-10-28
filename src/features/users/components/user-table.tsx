import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {actionsColumn} from "@/components/table/actions-column";
import {UserActions} from "@features/users/components/user-actions";
import type {User} from "@shared/user";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<User>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({getValue}) => <span className="font-medium">{getValue<string>()}</span>,
    },
    {accessorKey: "email", header: "E-Mail"},
    actionsColumn((user) => <UserActions user={user} />),
];

export function UserTable({users}: {users: User[]}) {
    return <DataTable columns={columns} data={users} emptyText="Keine User vorhanden." />;
}
