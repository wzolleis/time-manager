import {Link, useNavigate} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";
import {Summary} from "@/components/summary";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass} from "@/lib/format";
import {formatDifference, formatDuration, formatMonthName} from "@shared/format";
import type {YearMonthTotals} from "@shared/time-report";
import {ReportError} from "@features/reports/components/report-error";
import {useShowYearlyReport} from "@features/reports/use-cases/use-show-yearly-report";

const dash = "–";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<YearMonthTotals>[] = [
    {
        id: "month",
        header: "Monat",
        enableSorting: false,
        cell: ({row}) => (
            <Link to="/user/reports/monthly/$month" params={{month: row.original.month}} className="underline">
                {formatMonthName(row.original.month)}
            </Link>
        ),
    },
    {
        accessorKey: "targetMs",
        header: "Soll",
        enableSorting: false,
        cell: ({row}) => (row.original.targetMs > 0 ? formatDuration(row.original.targetMs) : dash),
    },
    {
        accessorKey: "workMs",
        header: "Arbeitszeit",
        enableSorting: false,
        cell: ({row}) => (row.original.workMs > 0 ? formatDuration(row.original.workMs) : dash),
    },
    {
        accessorKey: "diffMs",
        header: "Differenz",
        enableSorting: false,
        cell: ({row}) => {
            const diff = row.original.diffMs;
            return diff === null ? dash : <span className={diffClass(diff)}>{formatDifference(diff)}</span>;
        },
    },
];

/** year ist ein gültiges Jahr "JJJJ", geprüft in ReportYearlyPage */
export function ReportYearly({year}: {year: string}) {
    const navigate = useNavigate();
    const report = useShowYearlyReport(year);
    const {currentUser, totals, futureYear, partial, firstYear} = report;

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
    }

    const goTo = (target: string) => navigate({to: "/user/reports/yearly/$year", params: {year: target}});
    const beforeStart = !report.isPending && year < firstYear;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Jahresbericht</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · {year}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Vorheriges Jahr"
                    disabled={year <= firstYear}
                    onClick={() => goTo(String(Number(year) - 1))}
                >
                    ←
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Nächstes Jahr"
                    onClick={() => goTo(String(Number(year) + 1))}
                >
                    →
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={year === report.currentYear}
                    onClick={() => goTo(report.currentYear)}
                >
                    Dieses Jahr
                </Button>
            </div>

            {beforeStart ? (
                <p className="text-sm text-muted-foreground">
                    Die Zeiterfassung beginnt {firstYear}.{" "}
                    <Link to="/user/reports/yearly/$year" params={{year: firstYear}} className="underline">
                        Jahresbericht {firstYear}
                    </Link>
                </p>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Summary
                            title="Soll"
                            value={formatDuration(totals.targetYearMs)}
                            hint={
                                partial && !futureYear
                                    ? `bis heute: ${formatDuration(totals.targetToDateMs)}`
                                    : undefined
                            }
                        />
                        <Summary
                            title="Arbeitszeit"
                            value={formatDuration(totals.workMs)}
                            hint={totals.running ? "läuft noch" : undefined}
                        />
                        <Summary
                            title="Differenz"
                            value={futureYear ? dash : formatDifference(totals.diffMs)}
                            valueClassName={futureYear ? undefined : diffClass(totals.diffMs)}
                            hint={partial && !futureYear ? "gegen das Soll bis heute" : undefined}
                        />
                    </div>

                    {report.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
                    {report.error && <ReportError error={report.error} onRetry={report.retry} />}
                    {!report.isPending && !report.error && <DataTable columns={columns} data={totals.months} />}
                </>
            )}
        </div>
    );
}
