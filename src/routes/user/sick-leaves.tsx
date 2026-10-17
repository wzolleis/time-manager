import {createFileRoute} from "@tanstack/react-router";
import {SickLeavesPage} from "@features/sick-leaves/components/sick-leaves-page";

export const Route = createFileRoute("/user/sick-leaves")({
    component: SickLeavesPage,
});
