import type {ComponentProps} from "react";
import {cn} from "@/lib/utils";

/** Rahmen einer Seite mit Innenabstand und gleichem Abstand zwischen den Abschnitten */
export function Page({className, ...props}: ComponentProps<"div">) {
    return <div className={cn("space-y-4 p-4", className)} {...props} />;
}
