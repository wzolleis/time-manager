import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {deleteProject, fetchProjects} from "@/api/projects";
import {ProjectTable} from "@features/projects/components/project-table";
import {ProjectCreateDialog} from "@features/projects/components/project-create-dialog";
import type {Project} from "@shared/project";
import {ErrorText} from "@/components/text/error-text";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

export function Projects() {
    const qc = useQueryClient();

    const {
        data: projects,
        isPending,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["projects"],
        queryFn: fetchProjects,
    });

    const remove = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => qc.invalidateQueries({queryKey: ["projects"]}),
    });

    const handleDelete = (project: Project) => remove.mutate(project.id);

    return (
        <Page>
            <PageHeader title="Projekte" actions={<ProjectCreateDialog />} />

            {isPending && <Loading />}

            {isError && <LoadError error={error} onRetry={() => refetch()} />}

            {projects && (
                <ProjectTable
                    projects={projects}
                    onDelete={handleDelete}
                    deletingId={remove.isPending ? remove.variables : undefined}
                />
            )}

            {remove.isError && <ErrorText>{remove.error.message}</ErrorText>}
        </Page>
    );
}
