import {BaggageClaim, User} from "lucide-react";
import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard";
import type {DashboardAction} from "@/components/dashboard-action/types";
import {useIsAdmin} from "@/lib/user-context";

// Jeder angemeldete User hat die Rolle User und sieht sein Dashboard
const userDashboard: DashboardAction = {
    id: "user-dashboard",
    kind: "link",
    title: "User Dashboard",
    description: "Deine Zeiten, Urlaube und Berichte",
    label: "Zum User Dashboard",
    icon: User,
    to: "/user",
};

const adminDashboard: DashboardAction = {
    id: "admin-dashboard",
    kind: "link",
    title: "Administrator Dashboard",
    description: "Benutzer, Feiertage und Einstellungen für alle",
    label: "Zum Administrator Dashboard",
    icon: BaggageClaim,
    to: "/admin",
};

export const Dashboard = () => {
    const isAdmin = useIsAdmin();
    const actions = isAdmin ? [userDashboard, adminDashboard] : [userDashboard];

    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <>
            <ActionCardDashboard title="Dashboard" onActionConfirm={handleConfirm} actions={actions} />
        </>
    );
};
