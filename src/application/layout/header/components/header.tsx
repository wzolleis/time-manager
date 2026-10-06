import {Box, Button, Flex, Text} from "@radix-ui/themes";
import {UserDropdown} from "@features/users/components/user-dropdown.tsx";
import {Bell} from "lucide-react";
import {StartEnd} from "@/components/common/start-end.tsx";
import {MenuButton} from "@/components/common/menu-button.tsx";
import {Breadcrumb} from "@/application/breadcrumb/components/breadcrumb.tsx";
import {useNavigate} from "@tanstack/react-router";
import {NAVIGATION_ITEMS, type NavItem} from "@/application/navigation/nav-items.ts";
import {UserSelect} from "@/components/user-select.tsx";
import {useCurrentUser} from "@/lib/user-context.ts";
import type {User} from "@shared/user.ts";

export const Header = () => {
    const navigate = useNavigate();
    const userContext = useCurrentUser()
    const handleLogout = (): void => {
        console.log('Benutzer loggt sich aus...');
        // Logik für Authentifizierungs-Reset hier einfügen
    };

    const onItemSelected = (item: NavItem): void => {
        navigate({to: item.to})
    }


    const currentUser: User | null = userContext.currentUser;

    return (
        <Flex
            justify="between"
            align="center"
            px="4"
            py="3"
            style={{background: 'var(--color-background)', borderBottom: '1px solid var(--gray-4)'}}
        >
            <Flex align="center" gap="3" width={'100%'}>
                {/* Hamburger */}
                <Box display={{md: 'none'}}>
                    <MenuButton/>
                </Box>
                <StartEnd>
                    <Breadcrumb items={NAVIGATION_ITEMS}/> {/* dieselbe flache Liste wie für buildNavTree(navItems) */}
                    <Text color="gray">{`Hallo ${currentUser?.name}`}</Text>
                </StartEnd>
            </Flex>

            <Flex align="center" gap="3">
                <Button variant="ghost" size="2" radius="full">
                    <Bell size={18}/>
                </Button>

                <UserSelect/>
                {/* 2. Wiederverwendbares Dropdown */}
                <UserDropdown onItemSelected={onItemSelected} user={currentUser} onLogout={handleLogout}/>
            </Flex>
        </Flex>
    )
}