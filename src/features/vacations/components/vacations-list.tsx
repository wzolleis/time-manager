import {useState} from "react";
import {Button} from "@/components/ui/button";
import {germanDay, VACATION_DAYS_PER_YEAR} from "@shared/vacation-rules";
import {VacationActions} from "@features/vacations/components/vacation-actions";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {VacationDialog} from "@features/vacations/components/vacation-dialog";
import {MetricCard} from "@/components/cards/metric-card";
import {useShowVacations, type VacationRow as Row} from "@features/vacations/use-cases/use-show-vacations";
import {localDay} from "@shared/time-rules";

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
    {accessorKey: "workdays", header: "Urlaubstage", enableSorting: false}, // ohne Wochenenden, Feiertage und Krankheitstage
    {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({row}) => <VacationActions vacation={row.original} />,
    },
];

const dayLabel = (n: number) => (n === 1 ? "1 Tag" : `${n} Tage`);

export function VacationsList() {
    const [year, setYear] = useState(() => Number(localDay(new Date()).slice(0, 4)));
    const {currentUser, currentYear, rows, balance, isPending, error, retry} = useShowVacations(year);
    const loaded = !isPending && !error;

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
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
                <VacationDialog label="Urlaub eintragen" variant="default" size="default" />
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

            {loaded && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard title="Genommen" value={dayLabel(balance.taken)} hint="bis einschließlich heute" />
                    <MetricCard title="Geplant" value={dayLabel(balance.planned)} hint="ab morgen eingetragen" />
                    <MetricCard
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

            {isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {error && (
                <div className="space-y-2">
                    <p role="alert" className="text-sm text-destructive">
                        {error.message}
                    </p>
                    <Button variant="outline" onClick={retry}>
                        Erneut versuchen
                    </Button>
                </div>
            )}
            {loaded && (
                <DataTable columns={columns} data={rows} emptyText={`Für ${year} ist kein Urlaub eingetragen.`} />
            )}
        </div>
    );
}
