import {createFileRoute} from "@tanstack/react-router";
import {Projects} from "@features/projects/pages/projects";

export const Route = createFileRoute("/user/projects/")({
    component: Projects,
});
