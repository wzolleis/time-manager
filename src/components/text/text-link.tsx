import type {ComponentProps} from "react";
import {createLink, type LinkComponent} from "@tanstack/react-router";
import {cn} from "@/lib/utils";

/** Unterstrichener Link im Fließtext oder in einer Tabellenzelle */
function Anchor({className, ...props}: ComponentProps<"a">) {
    return <a className={cn("underline", className)} {...props} />;
}

const RouterAnchor = createLink(Anchor);

/** Link auf eine Route der Anwendung, mit typisiertem to und params wie Link von tanstack-router */
export const TextLink: LinkComponent<typeof Anchor> = (props) => <RouterAnchor {...props} />;

/** Link auf eine fremde Seite, öffnet in einem neuen Tab */
export function ExternalLink(props: ComponentProps<"a">) {
    return <Anchor target="_blank" rel="noreferrer" {...props} />;
}
