import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button.tsx";
import {deleteProject, fetchProjects} from "@/api/projects.ts";
import {ProjectTable} from "@features/projects/pages/project-table.tsx";
import {ProjectCreateDialog} from "@features/projects/pages/project-create-dialog.tsx";
import type {Project} from "@shared/project.ts";

export function Projects() {
    const qc = useQueryClient();

    const {data: projects, isPending, isError, error, refetch} = useQuery({
        queryKey: ["projects"],
        queryFn: fetchProjects,
    });

    const remove = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => qc.invalidateQueries({queryKey: ["projects"]}),
    });

    const handleDelete = (project: Project) => remove.mutate(project.id);

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Projekte</h1>
                <ProjectCreateDialog/>
            </div>

            {isPending && <p className="text-sm text-muted-foreground">Lade…</p>}

            {isError && (
                <div className="space-y-2">
                    <p role="alert" className="text-sm text-destructive">
                        {error.message}
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>
                        Erneut versuchen
                    </Button>
                </div>
            )}

            {projects && (
                <ProjectTable
                    projects={projects}
                    onDelete={handleDelete}
                    deletingId={remove.isPending ? remove.variables : undefined}
                />
            )}

            {remove.isError && (
                <p role="alert" className="text-sm text-destructive">
                    {remove.error.message}
                </p>
            )}
        </div>
    );
}