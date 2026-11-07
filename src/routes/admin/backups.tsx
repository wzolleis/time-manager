import {createFileRoute} from "@tanstack/react-router";
import {AdminBackupsPage} from "@features/backups/components/admin-backups-page";

export const Route = createFileRoute("/admin/backups")({
    component: AdminBackupsPage,
});
