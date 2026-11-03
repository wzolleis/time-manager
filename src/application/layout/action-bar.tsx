import type {ReactNode} from "react";
import {IconButton, IconLink} from "@/components/buttons/icon-button";
import {ConfirmActionDialog} from "@/components/dashboard-action/confirm-action-dialog";
import {useLogout} from "@/components/login/use-logout";
import {useCurrentUser} from "@/lib/user-context";
import {cn} from "@/lib/utils";
import {useUserSettings} from "@/views/user-settings";
import {SHOW_ACTION_BAR_SETTING_ID} from "@shared/user-setting";
import {booleanSettingOf} from "@shared/user-setting-rules";
import {LOGOUT_ACTION_ID, userDashboardActions} from "@features/dashboard/actions/user-dashboard-actions";

/** Platz, den der Inhalt unten freihält: Höhe der Leiste (h-14) und Abstand des Geräts */
const ACTION_BAR_SPACE = "pb-[calc(3.5rem+env(safe-area-inset-bottom))]";

/**
 * Ob die Action-Bar zu sehen ist (Einstellung show_action_bar). Erst wenn die Einstellungen geladen sind,
 * damit sie bei einem User, der sie ausgeschaltet hat, nicht kurz aufblitzt.
 */
function useShowActionBar(): boolean {
    const {currentUser} = useCurrentUser();
    const settings = useUserSettings(currentUser?.id);
    return settings.data !== undefined && booleanSettingOf(settings.data, SHOW_ACTION_BAR_SETTING_ID);
}

/**
 * Umgibt die Seite: Ist die Action-Bar eingeschaltet, zeigt er sie nach den children und hält unten Platz frei,
 * damit sie kein Seitenende verdeckt.
 */
export function ActionBarContainer({className, children}: {className?: string; children: ReactNode}) {
    const showActionBar = useShowActionBar();
    return (
        <div className={cn(className, showActionBar && ACTION_BAR_SPACE)}>
            {children}
            {showActionBar && <ActionBar />}
        </div>
    );
}

/** Leiste am unteren Rand mit den Aktionen des User Dashboards, nur als Icons */
function ActionBar() {
    const logout = useLogout();

    const handleConfirm = (id: string) => {
        if (id === LOGOUT_ACTION_ID) void logout();
    };

    return (
        <nav
            aria-label="Aktionen"
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)]"
        >
            <div className="flex h-14 items-center justify-around px-2">
                {userDashboardActions.map((action) =>
                    action.kind === "link" ? (
                        <IconLink key={action.id} icon={action.icon} label={action.title} to={action.to} />
                    ) : (
                        <ConfirmActionDialog key={action.id} action={action} onConfirm={handleConfirm}>
                            <IconButton icon={action.icon} label={action.title} />
                        </ConfirmActionDialog>
                    ),
                )}
            </div>
        </nav>
    );
}
