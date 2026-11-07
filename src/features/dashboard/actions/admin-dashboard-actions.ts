import {CalendarHeart, DatabaseBackup, KeyRound, Settings, User} from "lucide-react";
import type {DashboardAction} from "@/components/dashboard-action/types";

// Die Seiten unter /admin, die in keinem Menü stehen (menu: "admin-dashboard" in nav-items.ts)
export const adminDashboardActions: DashboardAction[] = [
    {
        id: "settings",
        kind: "link",
        title: "Einstellungen",
        description: "Einstellungen, die für alle User gelten",
        label: "Zu den Einstellungen",
        icon: Settings,
        to: "/admin/settings",
    },
    {
        id: "users",
        kind: "link",
        title: "Benutzer verwalten",
        description: "User anlegen, Rollen zuordnen und Passwörter zurücksetzen",
        label: "Zur Benutzerverwaltung",
        icon: User,
        to: "/admin/users",
    },
    {
        id: "holidays-admin",
        kind: "link",
        title: "Feiertage",
        description: "Feiertage für alle User pflegen",
        label: "Zu den Feiertagen",
        icon: CalendarHeart,
        to: "/admin/holidays",
    },
    {
        id: "api-tokens-admin",
        kind: "link",
        title: "Agent-Zugänge",
        description: "Agent-Zugänge aller User einsehen und widerrufen",
        label: "Zu den Agent-Zugängen",
        icon: KeyRound,
        to: "/admin/api-tokens",
    },
    {
        id: "backups",
        kind: "link",
        title: "Backups",
        description: "Backups der Datenbank prüfen, erstellen und auf den Rechner kopieren",
        label: "Zu den Backups",
        icon: DatabaseBackup,
        to: "/admin/backups",
    },
];
