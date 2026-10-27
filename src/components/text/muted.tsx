import type {ComponentProps} from "react";
import {cn} from "@/lib/utils";

/** Zurückhaltender Hinweistext, z. B. Untertitel, leere Listen oder Erklärungen im Dialog */
export function Muted({className, ...props}: ComponentProps<"p">) {
    return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
