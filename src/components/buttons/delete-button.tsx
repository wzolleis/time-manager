import {Trash2} from "lucide-react";
import {ActionButton, type ActionButtonProps} from "@/components/buttons/action-button";

type DeleteButtonProps = Omit<ActionButtonProps, "icon" | "label" | "variant"> & {label?: string};

/** Roter Button zum Löschen mit Mülleimer-Icon, auf schmalen Bildschirmen nur das Icon */
export function DeleteButton({label = "Löschen", ...props}: DeleteButtonProps) {
    return <ActionButton icon={Trash2} label={label} variant="destructive" {...props} />;
}
