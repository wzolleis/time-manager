import {useState} from "react";
import {Button} from "@/components/ui/button";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {MetricCard} from "@/components/cards/metric-card";
import {localDay} from "@shared/time-rules";
import {germanDay} from "@shared/vacation-rules";
import {SickLeaveActions} from "@features/sick-leaves/components/sick-leave-actions";
import {SickLeaveDialog} from "@features/sick-leaves/components/sick-leave-dialog";
import {type SickLeaveRow as Row, useShowSickLeaves} from "@features/sick-leaves/use-cases/use-show-sick-leaves";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";

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
    {accessorKey: "sickDays", header: "Krankheitstage", enableSorting: false}, // ohne Wochenenden und Feiertage
    {
        accessorKey: "note",
        header: "Notiz",
        enableSorting: false,
        cell: ({getValue}) => getValue<string | null>() ?? "",
    },
    {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({row}) => <SickLeaveActions sickLeave={row.original} />,
    },
];

const dayLabel = (n: number) => (n === 1 ? "1 Tag" : `${n} Tage`);

export function SickLeavesList() {
    const [year, setYear] = useState(() => Number(localDay(new Date()).slice(0, 4)));
    const {currentUser, currentYear, rows, total, isPending, error, retry} = useShowSickLeaves(year);
    const loaded = !isPending && !error;

    if (!currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    return (
        <>
            <PageHeader
                title="Krankmeldungen"
                description={
                    <>
                        {currentUser.name} · {year} · {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"}
                    </>
                }
                actions={<SickLeaveDialog label="Krankmeldung eintragen" variant="default" size="default" />}
            />

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
                    <MetricCard title="Krankheitstage" value={dayLabel(total)} hint="ohne Wochenenden und Feiertage" />
                </div>
            )}

            {isPending && <Loading />}
            {error && <LoadError error={error} onRetry={retry} />}
            {loaded && <DataTable columns={columns} data={rows} emptyText="Keine Krankheitstage" />}
        </>
    );
}
