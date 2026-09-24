import {BarChart3, PlusCircle, Trash2} from "lucide-react";
import type {DashboardAction} from "@/common/components/dashboard-action/types.ts";

export const actions = [
    {
        id: "report",
        kind: "link",
        title: "Report",
        description: "Auswertungen und Kennzahlen der letzten 30 Tage ansehen.",
        label: "Report öffnen",
        icon: BarChart3,
        href: "/reports",
    },
    {
        id: "create-item",
        kind: "link",
        title: "Neues Item",
        description: "Ein neues Item mit allen Angaben anlegen.",
        label: "Item anlegen",
        icon: PlusCircle,
        href: "/items/new",
    },
    {
        id: "delete-items",
        kind: "confirm",
        title: "Löschen",
        description: "Ausgewählte Items dauerhaft entfernen.",
        label: "Items löschen",
        icon: Trash2,
        confirmTitle: "Items wirklich löschen?",
        confirmText:
            "Die ausgewählten Items werden dauerhaft gelöscht. Das lässt sich nicht rückgängig machen.",
    },
] as const satisfies readonly DashboardAction[];

// Union der Ids: "report" | "create-item" | "delete-items"
export type ActionId = (typeof actions)[number]["id"];
