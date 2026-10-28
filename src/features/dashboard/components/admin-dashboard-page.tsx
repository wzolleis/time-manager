import {ActionCardDashboard} from "@/components/dashboard-action/action-card-dashboard";
import {adminDashboardActions} from "@features/dashboard/actions/admin-dashboard-actions";

export const AdminDashboard = () => {
    // Das Administrator Dashboard hat nur Links, nichts muss bestätigt werden
    const handleConfirm = () => {};

    return (
        <>
            <ActionCardDashboard
                title="Administrator Dashboard"
                onActionConfirm={handleConfirm}
                actions={adminDashboardActions}
            />
        </>
    );
};
