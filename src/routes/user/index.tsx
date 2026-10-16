import {createFileRoute} from "@tanstack/react-router";
import {UserDashboard} from "@features/dashboard/pages/user-dashboard";

export const Route = createFileRoute("/user/")({
    component: UserDashboard,
});
