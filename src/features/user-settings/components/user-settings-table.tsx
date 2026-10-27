import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {germanDay} from "@shared/vacation-rules";
import {UserSettingActions} from "@features/user-settings/components/user-setting-actions";
import {
    type UserSettingRow as Row,
    useShowUserSettings,
} from "@features/user-settings/use-cases/use-show-user-settings";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";

// Auf schmalen Bildschirmen dürfen kurze Spalten umbrechen, damit die Tabelle ohne Scrollen passt
const wrapOnPhone = {className: "whitespace-normal sm:whitespace-nowrap"};

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<Row>[] = [
    {
        id: "name",
        header: "Name",
        enableSorting: false,
        cell: ({row}) => (
            <>
                {row.original.setting.name}
                {/* Auf schmalen Bildschirmen steht die Beschreibung unter dem Namen statt in einer eigenen Spalte */}
                <div className="text-xs break-words whitespace-normal text-muted-foreground sm:hidden">
                    {row.original.setting.description}
                </div>
            </>
        ),
    },
    {accessorKey: "text", header: "Wert", enableSorting: false, meta: wrapOnPhone},
    {
        id: "validFrom",
        header: "gültig ab",
        enableSorting: false,
        meta: wrapOnPhone,
        cell: ({row}) => (row.original.validFrom ? germanDay(row.original.validFrom) : "–"),
    },
    {accessorKey: "status", header: "Status", enableSorting: false},
    {
        id: "description",
        header: "Beschreibung",
        enableSorting: false,
        meta: {className: "hidden sm:table-cell"},
        // TableCell ist nowrap, lange Beschreibungen brechen um
        cell: ({row}) => <div className="break-words whitespace-normal">{row.original.setting.description}</div>,
    },
    {id: "actions", header: "", enableSorting: false, cell: ({row}) => <UserSettingActions row={row.original} />},
];

export function UserSettingsTable() {
    const {currentUser, rows, isPending, error, retry} = useShowUserSettings();
    const loaded = !isPending && !error;

    if (!currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Einstellungen</h1>
                <Muted>
                    {currentUser.name} · Jeder Wert gilt ab einem Tag, ältere Werte gelten für die Vergangenheit weiter.
                </Muted>
            </div>

            {isPending && <Loading />}
            {error && <LoadError error={error} onRetry={retry} />}
            {loaded && <DataTable columns={columns} data={rows} emptyText="Keine Einstellungen" />}
        </div>
    );
}
