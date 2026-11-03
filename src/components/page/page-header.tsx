import type {ReactNode} from "react";
import {Muted} from "@/components/text/muted";
import {PageTitle} from "@/components/page/page-title";

type PageHeaderProps = {
    title: ReactNode;
    description?: ReactNode; // Untertitel, z. B. User und Zeitraum
    actions?: ReactNode; // rechts neben dem Titel, auf schmalen Bildschirmen darunter
};

/** Kopf einer Seite: Überschrift, optional Untertitel und Aktionen */
export function PageHeader({title, description, actions}: PageHeaderProps) {
    const heading = (
        <div>
            <PageTitle>{title}</PageTitle>
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
