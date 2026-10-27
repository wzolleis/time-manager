import type {ReactNode} from "react";
import {Muted} from "@/components/text/muted";

type PageHeaderProps = {
    title: ReactNode;
    description?: ReactNode; // Untertitel, z. B. User und Zeitraum
    actions?: ReactNode; // rechts neben dem Titel, auf schmalen Bildschirmen darunter
};

/** Kopf einer Seite: Überschrift, optional Untertitel und Aktionen */
export function PageHeader({title, description, actions}: PageHeaderProps) {
    const heading = (
        <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            {description && <Muted>{description}</Muted>}
        </div>
    );

    if (!actions) return heading;

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            {heading}
            {actions}
        </div>
    );
}
