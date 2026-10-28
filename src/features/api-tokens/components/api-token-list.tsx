import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {actionsColumn} from "@/components/table/actions-column";
import {formatDateTime} from "@shared/format";
import {type ApiTokenScope, ApiTokenRevoke} from "@features/api-tokens/components/api-token-revoke";
import type {ApiTokenRow} from "@features/api-tokens/use-cases/use-show-api-tokens";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";

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
const revokeColumn = (scope: ApiTokenScope) =>
    actionsColumn<ApiTokenRow>((row) => <ApiTokenRevoke token={row} scope={scope} />);

const ownColumns = [nameColumn, createdColumn, lastUsedColumn, expiresColumn, revokeColumn("own")];
const allColumns = [userColumn, nameColumn, createdColumn, lastUsedColumn, expiresColumn, revokeColumn("all")];

type Props = {
    scope: ApiTokenScope;
    tokens: {rows?: ApiTokenRow[]; isPending: boolean; error: Error | null; retry: () => unknown};
};

/** scope "own": die eigenen Tokens des Users. scope "all": die Tokens aller User mit Namen des Users. */
export function ApiTokenList({scope, tokens}: Props) {
    return (
        <>
            {tokens.isPending && <Loading />}
            {tokens.error && <LoadError error={tokens.error} onRetry={tokens.retry} />}
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
