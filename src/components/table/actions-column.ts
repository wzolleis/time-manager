import type {ReactNode} from "react";
import type {RowData} from "@tanstack/react-table";
import type {DataTableColumnDef} from "@/components/table/data-table";

/** Spalte ohne Überschrift und Sortierung für die Aktionen einer Zeile */
export function actionsColumn<TData extends RowData>(cell: (row: TData) => ReactNode): DataTableColumnDef<TData> {
    return {id: "actions", header: "", enableSorting: false, cell: ({row}) => cell(row.original)};
}
