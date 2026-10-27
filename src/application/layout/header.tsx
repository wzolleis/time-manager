import {Box, Flex, Text} from "@radix-ui/themes";
import {UserDropdown} from "@features/users/components/user-dropdown";
import {StartEnd} from "@/components/utils/start-end";
import {MenuButton} from "@/components/buttons/menu-button";
import {Breadcrumb} from "@/application/breadcrumb/breadcrumb";
import {useNavigate} from "@tanstack/react-router";
import {NAVIGATION_ITEMS, type NavItem} from "@/application/navigation/nav-items";
import {useCurrentUser} from "@/lib/user-context";
import type {User} from "@shared/user";
import {useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {logout, ME_QUERY_KEY} from "@/api/auth";
import {clearUserData} from "@/query-client";
import {PasswordChangeDialog} from "@features/auth/components/password-change-dialog";
import {VersionDialog} from "@features/version/components/version-dialog";
import {Sidebar} from "@/application/layout/sidebar";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";

export const Header = () => {
    const navigate = useNavigate();
    const userContext = useCurrentUser();
    const qc = useQueryClient();
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [versionOpen, setVersionOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async (): Promise<void> => {
        try {
            await logout();
        } finally {
            // Auch wenn der Server nicht erreichbar ist: lokal nichts vom User zurücklassen
            await clearUserData();
            qc.setQueryData(ME_QUERY_KEY, null);
        }
    };

    const onItemSelected = (item: NavItem): void => {
        navigate({to: item.to});
    };

    const currentUser: User = userContext.currentUser;

    return (
        <Flex
            justify="between"
            align="center"
            px="4"
            py="3"
            style={{background: "var(--color-background)", borderBottom: "1px solid var(--gray-4)"}}
        >
            {/* minWidth 0: die linke Seite schrumpft, Glocke und Avatar bleiben im Bild */}
            <Flex align="center" gap="3" width={"100%"} minWidth="0">
                {/* Hamburger */}
                <Box display={{md: "none"}}>
                    <MenuButton onClick={() => setMenuOpen(true)} />
                </Box>
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetContent side="left" className="w-72 overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Menü</SheetTitle>
                            <SheetDescription className="sr-only">Navigation</SheetDescription>
                        </SheetHeader>
                        <Sidebar items={NAVIGATION_ITEMS} onNavigate={() => setMenuOpen(false)} />
                    </SheetContent>
                </Sheet>
                <StartEnd>
                    <Breadcrumb items={NAVIGATION_ITEMS} /> {/* dieselbe flache Liste wie für buildNavTree(navItems) */}
                    {/* Auf schmalen Bildschirmen braucht die Breadcrumb den Platz */}
                    <Box display={{initial: "none", sm: "block"}} minWidth="0">
                        <Text as="div" color="gray" truncate>{`Hallo ${currentUser?.name}`}</Text>
                    </Box>
                </StartEnd>
            </Flex>

            <Flex align="center" gap="3" flexShrink="0">
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
            </Flex>
        </Flex>
    );
};
