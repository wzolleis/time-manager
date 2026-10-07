import {createFileRoute} from '@tanstack/react-router'
import {ProjectsIndexPage} from "@features/projects/pages/index-page.tsx";

export const Route = createFileRoute('/projects/')({
    component: ProjectsIndexPage,
})


