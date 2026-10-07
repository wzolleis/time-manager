import {actions} from "@features/time-report/actions/dashboard-actions.ts";
import {ActionCardDashboard} from "@/common/components/dashboard-action/action-card-dashboard.tsx";


export function IndexPage() {

    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return <ActionCardDashboard onActionConfirm={handleConfirm} actions={actions}/>
}
