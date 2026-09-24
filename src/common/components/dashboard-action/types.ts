/* ---------- Typen ---------- */

import type {LucideIcon} from "lucide-react";

export type ActionBase = {
    id: string;
    title: string;
    description: string;
    label: string;
    icon: LucideIcon;
};

// Springt zu einer anderen Seite
export type LinkAction = ActionBase & {
    kind: "link";
    href: string;
};

// Braucht eine Bestätigung, bevor etwas passiert
export type ConfirmAction = ActionBase & {
    kind: "confirm";
    confirmTitle: string;
    confirmText: string;
};

export type DashboardAction = LinkAction | ConfirmAction;