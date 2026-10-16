import {actions} from "@features/reports/actions/dashboard-actions.ts";
import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard.tsx";


export function IndexPage() {

    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <>
            <ActionCardDashboard title="Report" onActionConfirm={handleConfirm} actions={actions}/>
        </>
    )
}
