import {CalendarClock, CalendarDays, LogOut, Settings} from "lucide-react";
import type {DashboardAction} from "@/components/dashboard-action/types";

export const LOGOUT_ACTION_ID = "logout";

// Fest vorgegeben, bis der User die Aktionen selbst auswählen kann. Die Reihenfolge ist die Reihenfolge der Anzeige.
export const userDashboardActions: DashboardAction[] = [
    {
        id: "reports-daily",
        kind: "link",
        title: "Heute",
        description: "Stempeln und deine Buchungen von heute",
        label: "Zum Tagesbericht",
        icon: CalendarClock,
        to: "/user/reports/daily",
    },
    {
        id: "reports-weekly",
        kind: "link",
        title: "Woche",
        description: "Deine Arbeitszeit in dieser Woche",
        label: "Zum Wochenbericht",
        icon: CalendarDays,
        to: "/user/reports/weekly",
    },
    {
        id: "user-settings",
        kind: "link",
        title: "Einstellungen",
        description: "Soll pro Tag und Urlaubstage pro Jahr",
        label: "Zu den Einstellungen",
        icon: Settings,
        to: "/user/settings",
    },
    {
        id: LOGOUT_ACTION_ID,
        kind: "confirm",
        title: "Abmelden",
        description: "Beendet deine Sitzung auf diesem Gerät",
        label: "Abmelden",
        icon: LogOut,
        confirmTitle: "Abmelden?",
        confirmText: "Du wirst auf diesem Gerät abgemeldet.",
        confirmLabel: "Abmelden",
    },
];
