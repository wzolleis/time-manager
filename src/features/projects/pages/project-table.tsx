import {Table, TableBody, TableHead, TableHeader, TableRow,} from "@/components/ui/table.tsx";
import {ProjectRow} from "@features/projects/pages/project-row.tsx";
import type {Project} from "@shared/project.ts";

type ProjectTableProps = {
    projects: Project[];
    onDelete: (project: Project) => void;
    deletingId?: string;
};

export function ProjectTable({projects, onDelete, deletingId}: ProjectTableProps) {
    if (projects.length === 0) {
        return <p className="text-sm text-muted-foreground">Keine Projekte vorhanden.</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.map((project) => (
                        <ProjectRow
                            key={project.id}
                            project={project}
                            onDelete={onDelete}
                            deleting={deletingId === project.id}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}