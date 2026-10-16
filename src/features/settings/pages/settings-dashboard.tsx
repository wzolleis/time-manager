import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard";

export const SettingsDashboard = () => {
    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <>
            <ActionCardDashboard title="Einstellungen" onActionConfirm={handleConfirm} actions={[]}/>
        </>
    )
}