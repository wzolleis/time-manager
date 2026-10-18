import {Button} from "@/components/ui/button";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {formatDateTime} from "@/lib/format";
import {type ApiTokenScope, ApiTokenRevoke} from "@features/api-tokens/components/api-token-revoke";
import type {ApiTokenRow} from "@features/api-tokens/use-cases/use-show-api-tokens";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const userColumn: DataTableColumnDef<ApiTokenRow> = {accessorKey: "userName", header: "User"};
const nameColumn: DataTableColumnDef<ApiTokenRow> = {accessorKey: "name", header: "Name"};
const createdColumn: DataTableColumnDef<ApiTokenRow> = {
    accessorKey: "createdAt",
    header: "Erzeugt",
    cell: ({row}) => formatDateTime(row.original.createdAt),
};
const lastUsedColumn: DataTableColumnDef<ApiTokenRow> = {
    accessorKey: "lastUsedAt",
    header: "Zuletzt genutzt",
    enableSorting: false,
    cell: ({row}) => (row.original.lastUsedAt ? formatDateTime(row.original.lastUsedAt) : "nie"),
};
const expiresColumn: DataTableColumnDef<ApiTokenRow> = {
    accessorKey: "expiresAt",
    header: "Läuft ab",
    enableSorting: false,
    cell: ({row}) => {
        const {expiresAt, expired} = row.original;
        if (!expiresAt) return "kein Ablauf";
        return (
            <span className={expired ? "text-destructive" : undefined}>
                {formatDateTime(expiresAt)}
                {expired && " · abgelaufen"}
            </span>
        );
    },
};
const actionsColumn = (scope: ApiTokenScope): DataTableColumnDef<ApiTokenRow> => ({
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({row}) => <ApiTokenRevoke token={row.original} scope={scope} />,
});

const ownColumns = [nameColumn, createdColumn, lastUsedColumn, expiresColumn, actionsColumn("own")];
const allColumns = [userColumn, nameColumn, createdColumn, lastUsedColumn, expiresColumn, actionsColumn("all")];

type Props = {
    scope: ApiTokenScope;
    tokens: {rows?: ApiTokenRow[]; isPending: boolean; error: Error | null; retry: () => unknown};
};

/** scope "own": die eigenen Tokens des Users. scope "all": die Tokens aller User mit Namen des Users. */
export function ApiTokenList({scope, tokens}: Props) {
    return (
        <>
            {tokens.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {tokens.error && (
                <div className="space-y-2">
                    <p role="alert" className="text-sm text-destructive">
                        {tokens.error.message}
                    </p>
                    <Button variant="outline" onClick={tokens.retry}>
                        Erneut versuchen
                    </Button>
                </div>
            )}
            {tokens.rows && (
                <DataTable
                    columns={scope === "own" ? ownColumns : allColumns}
                    data={tokens.rows}
                    emptyText={scope === "own" ? "Du hast noch kein Token erzeugt." : "Kein User hat ein Token."}
                />
            )}
        </>
    );
}
