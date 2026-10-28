import {useQuery} from "@tanstack/react-query";
import {fetchProjects} from "@/api/projects";
import {ProjectTable} from "@features/projects/components/project-table";
import {ProjectCreateDialog} from "@features/projects/components/project-create-dialog";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

export function Projects() {
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

    return (
        <Page>
            <PageHeader title="Projekte" actions={<ProjectCreateDialog />} />

            {isPending && <Loading />}

            {isError && <LoadError error={error} onRetry={() => refetch()} />}

            {projects && <ProjectTable projects={projects} />}
        </Page>
    );
}
