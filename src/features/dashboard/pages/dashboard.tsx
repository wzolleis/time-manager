import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard";

export const Dashboard = () => {
    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <>
            <ActionCardDashboard title="Dashboard" onActionConfirm={handleConfirm} actions={[]} />
        </>
    );
};
