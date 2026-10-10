import {createFileRoute} from '@tanstack/react-router'
import {Projects} from "@user/projects/pages/projects.tsx";

export const Route = createFileRoute('/user/projects/')({
    component: Projects,
})


