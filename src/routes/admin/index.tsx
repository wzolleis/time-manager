import {createFileRoute} from "@tanstack/react-router";
import {AdminDashboard} from "@features/dashboard/components/admin-dashboard-page";

export const Route = createFileRoute("/admin/")({
    component: AdminDashboard,
});
