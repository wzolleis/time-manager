import {Box, Button, Flex, Text} from "@radix-ui/themes";
import {UserDropdown} from "@features/users/components/user-dropdown";
import {Bell} from "lucide-react";
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

export const Header = () => {
    const navigate = useNavigate();
    const userContext = useCurrentUser();
    const qc = useQueryClient();
    const [passwordOpen, setPasswordOpen] = useState(false);

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
            <Flex align="center" gap="3" width={"100%"}>
                {/* Hamburger */}
                <Box display={{md: "none"}}>
                    <MenuButton />
                </Box>
                <StartEnd>
                    <Breadcrumb items={NAVIGATION_ITEMS} /> {/* dieselbe flache Liste wie für buildNavTree(navItems) */}
                    <Text color="gray">{`Hallo ${currentUser?.name}`}</Text>
                </StartEnd>
            </Flex>

            <Flex align="center" gap="3">
                <Button variant="ghost" size="2" radius="full">
                    <Bell size={18} />
                </Button>

                {/* 2. Wiederverwendbares Dropdown */}
                <UserDropdown
                    onItemSelected={onItemSelected}
                    user={currentUser}
                    onLogout={handleLogout}
                    onChangePassword={() => setPasswordOpen(true)}
                />
                <PasswordChangeDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
            </Flex>
        </Flex>
    );
};
