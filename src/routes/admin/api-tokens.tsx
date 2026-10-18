import {createFileRoute} from "@tanstack/react-router";
import {AdminApiTokensPage} from "@features/api-tokens/components/admin-api-tokens-page";

export const Route = createFileRoute("/admin/api-tokens")({
    component: AdminApiTokensPage,
});
