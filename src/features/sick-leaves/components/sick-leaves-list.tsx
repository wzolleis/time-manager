import {useState} from "react";
import {formatDay} from "@shared/format";
import type {Day} from "@shared/date-schemas";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {actionsColumn} from "@/components/table/actions-column";
import {MetricCard} from "@/components/cards/metric-card";
import {localDay} from "@shared/time-rules";
import {SickLeaveActions} from "@features/sick-leaves/components/sick-leave-actions";
import {SickLeaveDialog} from "@features/sick-leaves/components/sick-leave-dialog";
import {type SickLeaveRow as Row, useShowSickLeaves} from "@features/sick-leaves/use-cases/use-show-sick-leaves";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {PeriodNav} from "@/components/buttons/period-nav";
import {MetricGrid} from "@/components/cards/metric-grid";
import {Button} from "@/components/ui/button";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<Row>[] = [
    {
        accessorKey: "startDate",
        header: "Beginn",
        cell: ({getValue}) => formatDay(getValue<Day>()),
    },
    {
        accessorKey: "endDate",
        header: "Ende",
        cell: ({getValue}) => formatDay(getValue<Day>()),
    },
    {accessorKey: "days", header: "Kalendertage", enableSorting: false},
    {accessorKey: "sickDays", header: "Krankheitstage", enableSorting: false}, // ohne Wochenenden und Feiertage
    {
        accessorKey: "note",
        header: "Notiz",
        enableSorting: false,
        cell: ({getValue}) => getValue<string | null>() ?? "",
    },
    actionsColumn((row) => <SickLeaveActions sickLeave={row} />),
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
                actions={<SickLeaveDialog trigger={<Button>Krankmeldung eintragen</Button>} />}
            />

            <PeriodNav
                unit="year"
                onPrevious={() => setYear(year - 1)}
                onNext={() => setYear(year + 1)}
                onCurrent={() => setYear(currentYear)}
                currentDisabled={year === currentYear}
            />

            {loaded && (
                <MetricGrid columns={3}>
                    <MetricCard title="Krankheitstage" value={dayLabel(total)} hint="ohne Wochenenden und Feiertage" />
                </MetricGrid>
            )}

            {isPending && <Loading />}
            {error && <LoadError error={error} onRetry={retry} />}
            {loaded && <DataTable columns={columns} data={rows} emptyText="Keine Krankheitstage" />}
        </>
    );
}
