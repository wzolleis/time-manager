import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard";

export const AdminDashboard = () => {
    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <>
            <ActionCardDashboard title="Administrator Dashboard" onActionConfirm={handleConfirm} actions={[]} />
        </>
    );
};
