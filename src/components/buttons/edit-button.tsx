import {Pencil} from "lucide-react";
import {ActionButton, type ActionButtonProps} from "@/components/buttons/action-button";

type EditButtonProps = Omit<ActionButtonProps, "icon" | "label"> & {label?: string};

/** Button zum Bearbeiten mit Stift-Icon, auf schmalen Bildschirmen nur das Icon */
export function EditButton({label = "Bearbeiten", ...props}: EditButtonProps) {
    return <ActionButton icon={Pencil} label={label} variant="outline" {...props} />;
}
