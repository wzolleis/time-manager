import {createFileRoute} from "@tanstack/react-router";
import {UserDashboard} from "@features/dashboard/components/user-dashboard-page";

export const Route = createFileRoute("/user/")({
    component: UserDashboard,
});
