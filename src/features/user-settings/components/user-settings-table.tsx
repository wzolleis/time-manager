import {Button} from "@/components/ui/button";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {germanDay} from "@shared/vacation-rules";
import {UserSettingActions} from "@features/user-settings/components/user-setting-actions";
import {
    type UserSettingRow as Row,
    useShowUserSettings,
} from "@features/user-settings/use-cases/use-show-user-settings";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<Row>[] = [
    {id: "name", header: "Name", enableSorting: false, cell: ({row}) => row.original.setting.name},
    {accessorKey: "text", header: "Wert", enableSorting: false},
    {
        id: "validFrom",
        header: "gültig ab",
        enableSorting: false,
        cell: ({row}) => (row.original.validFrom ? germanDay(row.original.validFrom) : "–"),
    },
    {accessorKey: "status", header: "Status", enableSorting: false},
    {
        id: "description",
        header: "Beschreibung",
        enableSorting: false,
        cell: ({row}) => row.original.setting.description,
    },
    {id: "actions", header: "", enableSorting: false, cell: ({row}) => <UserSettingActions row={row.original} />},
];

export function UserSettingsTable() {
    const {currentUser, rows, isPending, error, retry} = useShowUserSettings();
    const loaded = !isPending && !error;

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Einstellungen</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · Jeder Wert gilt ab einem Tag, ältere Werte gelten für die Vergangenheit weiter.
                </p>
            </div>

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
            {loaded && <DataTable columns={columns} data={rows} emptyText="Keine Einstellungen" />}
        </div>
    );
}
