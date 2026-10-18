import {createFileRoute} from "@tanstack/react-router";
import {ApiTokensPage} from "@features/api-tokens/components/api-tokens-page";

export const Route = createFileRoute("/user/api-tokens")({
    component: ApiTokensPage,
});
