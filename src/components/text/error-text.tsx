import type {ComponentProps} from "react";
import {cn} from "@/lib/utils";

type ErrorTextProps = ComponentProps<"p"> & {
    alert?: boolean; // false für Prüfhinweise beim Tippen, die nicht vorgelesen werden sollen
};

/** Fehlermeldung in Rot, standardmäßig mit role="alert" */
export function ErrorText({alert = true, className, ...props}: ErrorTextProps) {
    return <p role={alert ? "alert" : undefined} className={cn("text-sm text-destructive", className)} {...props} />;
}
