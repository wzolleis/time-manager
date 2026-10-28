/* ---------- Typen ---------- */

import type {LucideIcon} from "lucide-react";
import type {LinkProps} from "@tanstack/react-router";

export type ActionBase = {
    id: string;
    title: string;
    description: string;
    label: string;
    icon: LucideIcon;
};

// Springt zu einer anderen Seite
export type LinkAction = ActionBase &
    LinkProps & {
        kind: "link";
    };

// Braucht eine Bestätigung, bevor etwas passiert
export type ConfirmAction = ActionBase & {
    kind: "confirm";
    confirmTitle: string;
    confirmText: string;
    // Text des Buttons, der in der Bestätigung die Aktion ausführt
    confirmLabel: string;
};

export type DashboardAction = LinkAction | ConfirmAction;

export const isLinkAction = (action: unknown | undefined): action is LinkAction => {
    return (action as LinkAction).kind === "link";
};

export const isConfirmAction = (action: unknown | undefined): action is ConfirmAction => {
    return (action as ConfirmAction).kind === "confirm";
};
