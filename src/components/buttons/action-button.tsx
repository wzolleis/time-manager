import type {ComponentProps} from "react";
import type {LucideIcon} from "lucide-react";
import {Button} from "@/components/ui/button";

export type ActionButtonProps = Omit<ComponentProps<typeof Button>, "children" | "size" | "className"> & {
    icon: LucideIcon;
    label: string;
};

/**
 * Kleiner Button mit Icon und Text, z. B. in der Aktionsspalte einer Tabelle. Auf schmalen Bildschirmen bleibt
 * nur das Icon, der Text bleibt für Screenreader lesbar und erscheint als Tooltip.
 */
export function ActionButton({icon: Icon, label, ...props}: ActionButtonProps) {
    return (
        <Button size="sm" title={label} className="max-sm:w-7 max-sm:px-0" {...props}>
            <Icon data-icon="inline-start" />
            <span className="max-sm:sr-only">{label}</span>
        </Button>
    );
}
