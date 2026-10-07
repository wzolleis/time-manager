import {ActionCardDashboard} from "@/common/components/dashboard-action/action-card-dashboard.tsx";
import {actions} from "@features/projects/actions/dashboard-actions.ts";

export const ProjectsIndexPage = () => {
    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return <ActionCardDashboard onActionConfirm={handleConfirm} actions={actions}/>
}