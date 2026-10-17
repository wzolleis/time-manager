import {createFileRoute} from "@tanstack/react-router";
import {VacationsPage} from "@features/vacations/components/vacations-page";

export const Route = createFileRoute("/user/vacations")({
    component: VacationsPage,
});
