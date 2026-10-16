import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard";
import type {DashboardAction} from "@/components/dashboard-action/types";

const actions: DashboardAction[] = []

export const UserDashboard = () => {
    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <>
            <ActionCardDashboard title="User Dashboard" onActionConfirm={handleConfirm} actions={actions}/>
        </>
    )
}