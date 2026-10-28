import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard";
import {useLogout} from "@/components/login/use-logout";
import {LOGOUT_ACTION_ID, userDashboardActions} from "@features/dashboard/actions/user-dashboard-actions";

// Jeder angemeldete User hat die Rolle User und sieht hier die Aktionen seines User Dashboards
export const Dashboard = ({title = "Dashboard"}: {title?: string}) => {
    const logout = useLogout();

    const handleConfirm = (id: string) => {
        if (id === LOGOUT_ACTION_ID) void logout();
    };

    return (
        <>
            <ActionCardDashboard title={title} onActionConfirm={handleConfirm} actions={userDashboardActions} />
        </>
    );
};
