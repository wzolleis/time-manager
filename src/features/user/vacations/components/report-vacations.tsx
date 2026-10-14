import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {fetchVacations} from "@/api/vacations";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {localDay} from "@shared/time-rules";
import {countWorkdays, dayCount, germanDay, VACATION_DAYS_PER_YEAR, vacationBalance,} from "@shared/vacation-rules";
import type {Vacation} from "@shared/vacation";
import {VacationActions} from "@user/vacations/components/vacation-actions.tsx";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table.tsx";
import {VacationDialog} from "@user/vacations/components/vacation-dialog.tsx";
import {Summary} from "@user/reports/components/report-daily.tsx";

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

const dayLabel = (n: number) => (n === 1 ? "1 Tag" : `${n} Tage`);

export function ReportVacations() {
    const {currentUser} = useCurrentUser();
    const userId = currentUser?.id;
    const now = useNow();
    const today = localDay(new Date(now));
    const currentYear = Number(today.slice(0, 4));
    const [year, setYear] = useState(currentYear);

    const vacations = useQuery({
        queryKey: ["vacations", userId],
        queryFn: () => fetchVacations(userId!),
        enabled: !!userId,
    });

    // Nur Urlaube, die zumindest teilweise im gewählten Jahr liegen
    const rows = useMemo<Row[]>(
        () =>
            (vacations.data ?? [])
                .filter((v) => v.startDate <= `${year}-12-31` && v.endDate >= `${year}-01-01`)
                .map((v) => ({
                    ...v,
                    days: dayCount(v.startDate, v.endDate),
                    workdays: countWorkdays(v.startDate, v.endDate),
                })),
        [vacations.data, year],
    );
    const balance = useMemo(
        () => vacationBalance(vacations.data ?? [], year, today),
        [vacations.data, year, today],
    );

    if (!currentUser) {
        return (
            <p className="text-sm text-muted-foreground">
                Bitte zuerst einen User anlegen und auswählen.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Urlaub</h1>
                    <p className="text-sm text-muted-foreground">
                        {currentUser.name} · {year} · {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"} ·{" "}
                        {VACATION_DAYS_PER_YEAR} Urlaubstage im Jahr
                    </p>
                </div>
                <VacationDialog label="Urlaub eintragen" variant="default" size="default"/>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" aria-label="Vorheriges Jahr" onClick={() => setYear(year - 1)}>
                    ←
                </Button>
                <Button variant="outline" size="sm" aria-label="Nächstes Jahr" onClick={() => setYear(year + 1)}>
                    →
                </Button>
                <Button variant="ghost" size="sm" disabled={year === currentYear} onClick={() => setYear(currentYear)}>
                    Dieses Jahr
                </Button>
            </div>

            {vacations.isSuccess && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Summary title="Genommen" value={dayLabel(balance.taken)} hint="bis einschließlich heute"/>
                    <Summary title="Geplant" value={dayLabel(balance.planned)} hint="ab morgen eingetragen"/>
                    <Summary
                        title="Ungeplant"
                        value={dayLabel(balance.unplanned)}
                        valueClassName={balance.over > 0 ? "text-destructive" : undefined}
                        hint={
                            balance.over > 0
                                ? `${dayLabel(balance.over)} über dem Jahresurlaub`
                                : `verfällt am 31.12.${year}`
                        }
                    />
                </div>
            )}

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
                <DataTable columns={columns} data={rows} emptyText={`Für ${year} ist kein Urlaub eingetragen.`}/>
            )}
        </div>
    );
}