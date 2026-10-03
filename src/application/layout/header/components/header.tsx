import {Box, Button, Flex, Text} from "@radix-ui/themes";
import {UserDropdown} from "@features/users/components/user-dropdown.tsx";
import {Bell} from "lucide-react";
import type {User} from "@features/users/types.ts";
import {StartEnd} from "@/components/common/start-end.tsx";
import {MenuButton} from "@/components/common/menu-button.tsx";
import {Breadcrumb} from "@/application/breadcrumb/components/breadcrumb.tsx";
import {useNavigate} from "@tanstack/react-router";
import {NAVIGATION_ITEMS, type NavItem} from "@/application/navigation/nav-items.ts";

export interface HeaderProps {
    currentUser: User
}

export const Header = (props: HeaderProps) => {
    const navigate = useNavigate();
    const {currentUser} = props;
    const handleLogout = (): void => {
        console.log('Benutzer loggt sich aus...');
        // Logik für Authentifizierungs-Reset hier einfügen
    };

    const onItemSelected = (item: NavItem): void => {
        navigate({to: item.to})
    }

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
                    <Text color="gray">{`Hallo ${currentUser.name}`}</Text>
                </StartEnd>
            </Flex>

            <Flex align="center" gap="3">
                <Button variant="ghost" size="2" radius="full">
                    <Bell size={18}/>
                </Button>

                {/* 2. Wiederverwendbares Dropdown */}
                <UserDropdown onItemSelected={onItemSelected} user={currentUser} onLogout={handleLogout}/>
            </Flex>
        </Flex>
    )
}