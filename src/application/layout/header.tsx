import {UserDropdown} from "@features/users/components/user-dropdown";
import {StartEnd} from "@/components/utils/start-end";
import {MenuButton} from "@/components/buttons/menu-button";
import {Breadcrumb} from "@/application/breadcrumb/breadcrumb";
import {useNavigate} from "@tanstack/react-router";
import {NAVIGATION_ITEMS, navItemsOf, type NavItem} from "@/application/navigation/nav-items";
import {useCurrentUser, useIsAdmin} from "@/lib/user-context";
import type {CurrentUser} from "@shared/user";
import {useState} from "react";
import {useLogout} from "@/components/login/use-logout";
import {PasswordChangeDialog} from "@features/auth/components/password-change-dialog";
import {VersionDialog} from "@features/version/components/version-dialog";
import {Sidebar} from "@/application/layout/sidebar";
import {AdminDropdown} from "@/application/layout/admin-dropdown";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";

export const Header = () => {
    const navigate = useNavigate();
    const userContext = useCurrentUser();
    const isAdmin = useIsAdmin();
    const handleLogout = useLogout();
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [versionOpen, setVersionOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const onItemSelected = (item: NavItem): void => {
        navigate({to: item.to});
    };

    const currentUser: CurrentUser = userContext.currentUser;

    return (
        <div className="flex items-center justify-between border-b bg-background px-4 py-3">
            {/* minWidth 0: die linke Seite schrumpft, Glocke und Avatar bleiben im Bild */}
            <div className="flex w-full min-w-0 items-center gap-3">
                {/* Hamburger */}
                <div className="md:hidden">
                    <MenuButton onClick={() => setMenuOpen(true)} />
                </div>
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetContent side="left" className="w-72 overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Menü</SheetTitle>
                            <SheetDescription className="sr-only">Navigation</SheetDescription>
                        </SheetHeader>
                        <Sidebar items={navItemsOf("sidebar")} onNavigate={() => setMenuOpen(false)} />
                    </SheetContent>
                </Sheet>
                <StartEnd>
                    <Breadcrumb items={NAVIGATION_ITEMS} />{" "}
                    {/* alle Einträge, auch die aus Administrator- und Avatar-Menü */}
                    {/* Auf schmalen Bildschirmen braucht die Breadcrumb den Platz */}
                    <div className="hidden min-w-0 truncate text-muted-foreground sm:block">
                        {`Hallo ${currentUser?.name}`}
                    </div>
                </StartEnd>
            </div>

            <div className="flex shrink-0 items-center gap-3">
                {isAdmin && <AdminDropdown onItemSelected={onItemSelected} />}
                {/* 2. Wiederverwendbares Dropdown */}
                <UserDropdown
                    onItemSelected={onItemSelected}
                    user={currentUser}
                    onLogout={handleLogout}
                    onChangePassword={() => setPasswordOpen(true)}
                    onShowVersion={() => setVersionOpen(true)}
                />
                <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
                <VersionDialog open={versionOpen} onOpenChange={setVersionOpen} />
            </div>
        </div>
    );
};
