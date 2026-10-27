import {createFileRoute} from "@tanstack/react-router";
import {PasskeysPage} from "@features/passkeys/components/passkeys-page";

export const Route = createFileRoute("/user/passkeys")({
    component: PasskeysPage,
});
