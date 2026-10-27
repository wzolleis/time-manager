import {
    type ColumnDef,
    columnVisibilityFeature,
    createSortedRowModel,
    flexRender,
    metaHelper,
    type RowData,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_basic,
    sortFn_datetime,
    tableFeatures,
    useTable,
} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

// Modulebene: nur die Features, die wir wirklich brauchen
const features = tableFeatures({
    rowSortingFeature,
    columnVisibilityFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: {
        alphanumeric: sortFn_alphanumeric, // Texte
        basic: sortFn_basic, // Zahlen und Sonstiges
        datetime: sortFn_datetime, // Datumswerte (Date)
    },
    // className gilt für Kopf- und Datenzellen der Spalte, z.B. zum Ausblenden auf kleinen Bildschirmen
    columnMeta: metaHelper<{className?: string}>(),
});

// Diesen Typ verwenden die Spaltendefinitionen der einzelnen Tabellen
export type DataTableColumnDef<TData extends RowData> = ColumnDef<typeof features, TData>;

type DataTableProps<TData extends RowData> = {
    columns: DataTableColumnDef<TData>[];
    data: TData[];
    emptyText?: string;
};

export function DataTable<TData extends RowData>({
    columns,
    data,
    emptyText = "Keine Einträge vorhanden.",
}: DataTableProps<TData>) {
    const table = useTable({
        features,
        columns,
        data,
    });

    const rows = table.getRowModel().rows;

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((group) => (
                        <TableRow key={group.id}>
                            {group.headers.map((header) => {
                                const canSort = header.column.getCanSort();
                                const sorted = header.column.getIsSorted();
                                return (
                                    <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                                        {header.isPlaceholder ? null : canSort ? (
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 hover:text-foreground"
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <span aria-hidden>
                                                    {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : ""}
                                                </span>
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {rows.length ? (
                        rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                {emptyText}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
