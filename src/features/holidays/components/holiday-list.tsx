import {useState} from "react";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {useNow} from "@/lib/use-now";
import {useCurrentUser} from "@/lib/user-context";
import {HolidayActions} from "@features/holidays/components/holiday-actions";
import {HolidayDialog} from "@features/holidays/components/holiday-dialog";
import {type HolidayRow, type HolidayScope, useShowHolidays} from "@features/holidays/use-cases/use-show-holidays";
import {localDay} from "@shared/time-rules";
import {germanDay} from "@shared/vacation-rules";
import {isWeekend, weekdayIndex} from "@shared/week";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {PeriodNav} from "@/components/buttons/period-nav";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const dateColumn: DataTableColumnDef<HolidayRow> = {
    accessorKey: "date",
    header: "Datum",
    cell: ({row}) => {
        const date = row.original.date;
        const weekend = isWeekend(date);
        return (
            <span>
                {WEEKDAYS[weekdayIndex(date)]}, {germanDay(date)}
                {weekend && <span className="ml-2 text-muted-foreground">Wochenende</span>}
            </span>
        );
    },
};
const nameColumn: DataTableColumnDef<HolidayRow> = {accessorKey: "name", header: "Name", enableSorting: false};
const scopeColumn: DataTableColumnDef<HolidayRow> = {
    accessorKey: "userId",
    header: "Gilt für",
    enableSorting: false,
    cell: ({row}) => (row.original.userId === null ? "alle" : "nur mich"),
};
const actionsColumn: DataTableColumnDef<HolidayRow> = {
    id: "actions",
    header: "",
    enableSorting: false,
    // Globale Feiertage sind im User-Bereich nur zum Lesen da
    cell: ({row}) =>
        row.original.editable ? <HolidayActions holiday={row.original} userName={row.original.userName} /> : null,
};

const globalColumns = [dateColumn, nameColumn, actionsColumn];
const userColumns = [dateColumn, nameColumn, scopeColumn, actionsColumn];

type Props = {scope: HolidayScope};

/**
 * scope "global": die Feiertage für alle, zum Pflegen im Admin-Bereich.
 * scope "user": globale und eigene Feiertage des aktuellen Users, nur die eigenen sind änderbar.
 */
export function HolidayList({scope}: Props) {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const currentYear = Number(localDay(new Date(now)).slice(0, 4));
    const [year, setYear] = useState(currentYear);

    const holidays = useShowHolidays(scope, year);
    const count = holidays.rows?.length ?? 0;

    if (scope === "user" && !currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    return (
        <>
            <PageHeader
                title={scope === "global" ? "Feiertage für alle" : "Feiertage"}
                description={
                    <>
                        {scope === "user" && `${currentUser!.name} · `}
                        {year} · {count} {count === 1 ? "Feiertag" : "Feiertage"}
                    </>
                }
                actions={
                    <HolidayDialog
                        userId={scope === "global" ? null : currentUser!.id}
                        userName={currentUser?.name}
                        label={scope === "global" ? "Feiertag eintragen" : "Eigenen Feiertag eintragen"}
                        variant="default"
                        size="default"
                    />
                }
            />

            <PeriodNav
                unit="year"
                onPrevious={() => setYear(year - 1)}
                onNext={() => setYear(year + 1)}
                onCurrent={() => setYear(currentYear)}
                currentDisabled={year === currentYear}
            />

            {holidays.isPending && <Loading />}
            {holidays.error && <LoadError error={holidays.error} onRetry={holidays.retry} />}
            {holidays.rows && (
                <DataTable
                    columns={scope === "global" ? globalColumns : userColumns}
                    data={holidays.rows}
                    emptyText={`Für ${year} ist kein Feiertag eingetragen.`}
                />
            )}
        </>
    );
}
