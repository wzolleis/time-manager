import type {ReactNode} from "react";
import {formatDay} from "@shared/format";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {actionsColumn} from "@/components/table/actions-column";
import {UserSettingActions} from "@features/user-settings/components/user-setting-actions";
import {
    type UserSettingRow as Row,
    useShowUserSettings,
} from "@features/user-settings/use-cases/use-show-user-settings";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";

// Außerhalb der Komponente, damit die Spalten stabil bleiben

const valueColumn: DataTableColumnDef<Row> = {
    accessorKey: "text",
    header: "Wert",
    enableSorting: false,
    meta: {onSmallScreens: "wrap"},
};
const actions = actionsColumn<Row>((row) => <UserSettingActions row={row} />);

/** Einstellungen ohne Historie: eine Zeile je Einstellung, ohne „gültig ab“ und Status */
const immediateColumns: DataTableColumnDef<Row>[] = [
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
    valueColumn,
    {
        id: "description",
        header: "Beschreibung",
        enableSorting: false,
        meta: {onSmallScreens: "hide"},
        // TableCell ist nowrap, lange Beschreibungen brechen um
        cell: ({row}) => <div className="break-words whitespace-normal">{row.original.setting.description}</div>,
    },
    actions,
];

/** Eine Einstellung mit Historie: Name und Beschreibung stehen in der Überschrift, je Wert eine Zeile */
const historyColumns: DataTableColumnDef<Row>[] = [
    valueColumn,
    {
        id: "validFrom",
        header: "gültig ab",
        enableSorting: false,
        meta: {onSmallScreens: "wrap"},
        cell: ({row}) => (row.original.validFrom ? formatDay(row.original.validFrom) : "–"),
    },
    {accessorKey: "status", header: "Status", enableSorting: false},
    actions,
];

type SettingsSectionProps = {title: string; description?: string[]; children: ReactNode};

/** Abschnitt der Seite: Überschrift, optional Absätze mit Beschreibung, darunter eine Tabelle */
function SettingsSection({title, description = [], children}: SettingsSectionProps) {
    return (
        <section className="space-y-2">
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description.map((text) => (
                    <Muted key={text}>{text}</Muted>
                ))}
            </div>
            {children}
        </section>
    );
}

const HISTORY_HINT = "Jeder Wert gilt ab einem Tag, ältere Werte gelten für die Vergangenheit weiter.";

export function UserSettingsTable() {
    const {currentUser, immediate, histories, isPending, error, retry} = useShowUserSettings();
    const loaded = !isPending && !error;

    if (!currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    return (
        <>
            <PageHeader title="Einstellungen" description={currentUser.name} />

            {isPending && <Loading />}
            {error && <LoadError error={error} onRetry={retry} />}
            {loaded && immediate.length > 0 && (
                <SettingsSection title="Allgemein">
                    <DataTable columns={immediateColumns} data={immediate} emptyText="Keine Einstellungen" />
                </SettingsSection>
            )}
            {loaded &&
                histories.map(({setting, rows}) => (
                    <SettingsSection
                        key={setting.id}
                        title={setting.name}
                        description={[setting.description, HISTORY_HINT]}
                    >
                        <DataTable columns={historyColumns} data={rows} emptyText="Keine Werte" />
                    </SettingsSection>
                ))}
        </>
    );
}
