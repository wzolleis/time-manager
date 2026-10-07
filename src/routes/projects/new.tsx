import {createFileRoute} from '@tanstack/react-router'
import {ProjectsNew} from "@features/projects/pages/new.tsx";

export const Route = createFileRoute('/projects/new')({
    component: ProjectsNew,
})
