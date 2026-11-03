import type {ReactNode} from "react";
import {cn} from "@/lib/utils";

type MetricGridProps = {
    columns: 3 | 4; // auf breiten Bildschirmen, auf schmalen stehen die Karten untereinander
    children: ReactNode; // die MetricCards
};

/** Zeile mit Kennzahl-Karten */
export function MetricGrid({columns, children}: MetricGridProps) {
    return (
        <div className={cn("grid gap-4", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4")}>
            {children}
        </div>
    );
}
