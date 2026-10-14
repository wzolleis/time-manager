import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {fetchVacations} from "@/api/vacations";
import {useCurrentUser} from "@/lib/user-context";
import {countWorkdays, dayCount, germanDay} from "@shared/vacation-rules";
import type {Vacation} from "@shared/vacation";
import {VacationActions} from "@user/vacations/components/vacation-actions.tsx";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table.tsx";
import {VacationDialog} from "@user/vacations/components/vacation-dialog.tsx";

type Row = Vacation & { days: number; workdays: number };

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<Row>[] = [
    {
        accessorKey: "startDate",
        header: "Beginn",
        cell: ({getValue}) => germanDay(getValue<string>()),
    },
    {
        accessorKey: "endDate",
        header: "Ende",
        cell: ({getValue}) => germanDay(getValue<string>()),
    },
    {accessorKey: "days", header: "Kalendertage", enableSorting: false},
    {accessorKey: "workdays", header: "Arbeitstage", enableSorting: false},
    {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({row}) => <VacationActions vacation={row.original}/>,
    },
];

export function ReportVacations() {
    const {currentUser} = useCurrentUser();
    const userId = currentUser?.id;

    const vacations = useQuery({
        queryKey: ["vacations", userId],
        queryFn: () => fetchVacations(userId!),
        enabled: !!userId,
    });

    const rows = useMemo<Row[]>(
        () =>
            (vacations.data ?? []).map((v) => ({
                ...v,
                days: dayCount(v.startDate, v.endDate),
                workdays: countWorkdays(v.startDate, v.endDate),
            })),
        [vacations.data],
    );

    if (!currentUser) {
        return (
            <p className="text-sm text-muted-foreground">
                Bitte zuerst einen User anlegen und auswählen.
            </p>
        );
    }

    const totalWorkdays = rows.reduce((sum, r) => sum + r.workdays, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Urlaub</h1>
                    <p className="text-sm text-muted-foreground">
                        {currentUser.name} · {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"} ·{" "}
                        {totalWorkdays} Arbeitstage
                    </p>
                </div>
                <VacationDialog label="Urlaub eintragen" variant="default" size="default"/>
            </div>

            {vacations.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {vacations.isError && (
                <div className="space-y-2">
                    <p role="alert" className="text-sm text-destructive">
                        {vacations.error.message}
                    </p>
                    <Button variant="outline" onClick={() => vacations.refetch()}>
                        Erneut versuchen
                    </Button>
                </div>
            )}
            {vacations.isSuccess && (
                <DataTable columns={columns} data={rows} emptyText="Noch kein Urlaub eingetragen."/>
            )}
        </div>
    );
}