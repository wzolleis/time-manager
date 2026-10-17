import {createFileRoute} from "@tanstack/react-router";
import {IndexPage} from "@features/time-stamp/components/index-page";

export const Route = createFileRoute("/user/time-stamp/")({
    component: IndexPage,
});
