import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {actionsColumn} from "@/components/table/actions-column";
import {ProjectActions} from "@features/projects/components/project-actions";
import type {Project} from "@shared/project";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<Project>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({getValue}) => <span className="font-medium">{getValue<string>()}</span>,
    },
    actionsColumn((project) => <ProjectActions project={project} />),
];

export function ProjectTable({projects}: {projects: Project[]}) {
    return <DataTable columns={columns} data={projects} emptyText="Keine Projekte vorhanden." />;
}
