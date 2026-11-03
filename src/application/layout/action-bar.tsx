import {useState, type ReactNode} from "react";
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
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-muted pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgb(0_0_0/0.06)]"
        >
            {/* Der Link zur aktuellen Seite (aria-current="page", setzt der Router) ist farbig hinterlegt */}
            <div className="flex h-14 items-center justify-around px-2 [&_a[aria-current=page]]:bg-primary [&_a[aria-current=page]]:text-primary-foreground [&_a[aria-current=page]]:hover:bg-primary">
                {userDashboardActions.map((action) => (
                    <PressFeedback key={action.id}>
                        {action.kind === "link" ? (
                            <IconLink icon={action.icon} label={action.title} to={action.to} />
                        ) : (
                            <ConfirmActionDialog action={action} onConfirm={handleConfirm}>
                                <IconButton icon={action.icon} label={action.title} />
                            </ConfirmActionDialog>
                        )}
                    </PressFeedback>
                ))}
            </div>
        </nav>
    );
}

/**
 * Zeigt, dass ein Button gedrückt wird: Fährt die Maus darüber, wird er etwas größer (nur auf Geräten mit Maus,
 * Tailwind setzt hover: dort ein). Solange der Finger oder die Maus drückt, wird er noch größer.
 * Nach dem Klick läuft ein kurzer Ring um ihn herum. Bei „Bewegung reduzieren“ entfällt beides.
 */
function PressFeedback({children}: {children: ReactNode}) {
    // Jeder Klick erzeugt einen neuen key, damit der Ring auch bei schnellen Klicks neu startet
    const [clicks, setClicks] = useState(0);

    return (
        <div
            className="relative *:transition-transform *:duration-150 *:ease-out *:motion-safe:hover:scale-110 *:motion-safe:active:scale-125"
            onClick={() => setClicks((count) => count + 1)}
        >
            {children}
            {clicks > 0 && (
                <span
                    key={clicks}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full bg-primary/25 opacity-0 motion-safe:animate-press-ripple"
                />
            )}
        </div>
    );
}
