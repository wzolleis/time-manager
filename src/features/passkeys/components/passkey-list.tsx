import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {formatDateTime} from "@shared/format";
import type {Passkey} from "@shared/passkey";
import {PasskeyDelete} from "@features/passkeys/components/passkey-delete";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<Passkey>[] = [
    {accessorKey: "name", header: "Name"},
    {
        accessorKey: "backedUp",
        header: "Synchronisiert",
        enableSorting: false,
        cell: ({row}) => (row.original.backedUp ? "ja" : "nein"),
    },
    {
        accessorKey: "createdAt",
        header: "Hinzugefügt",
        cell: ({row}) => formatDateTime(row.original.createdAt),
    },
    {
        accessorKey: "lastUsedAt",
        header: "Zuletzt genutzt",
        enableSorting: false,
        cell: ({row}) => (row.original.lastUsedAt ? formatDateTime(row.original.lastUsedAt) : "nie"),
    },
    {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({row}) => <PasskeyDelete passkey={row.original} />,
    },
];

type Props = {
    passkeys: {rows?: Passkey[]; isPending: boolean; error: Error | null; retry: () => unknown};
};

export function PasskeyList({passkeys}: Props) {
    return (
        <>
            {passkeys.isPending && <Loading />}
            {passkeys.error && <LoadError error={passkeys.error} onRetry={passkeys.retry} />}
            {passkeys.rows && (
                <DataTable
                    columns={columns}
                    data={passkeys.rows}
                    emptyText="Du hast noch keinen Passkey eingetragen."
                />
            )}
        </>
    );
}
