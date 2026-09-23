import {Box, Button, Flex, Text} from "@radix-ui/themes";
import {UserDropdown} from "@user/components/user-dropdown.tsx";
import {Bell} from "lucide-react";
import type {User} from "@user/types.ts";
import {StartEnd} from "@/components/common/start-end.tsx";
import {MenuButton} from "@/components/common/menu-button.tsx";
import {Breadcrumb} from "@/application/breadcrumb/components/breadcrumb.tsx";
import type {NavItem} from "@/application/navigation/types.ts";
import {useNavigate} from "@tanstack/react-router";

export interface HeaderProps {
    activeItem: NavItem
    currentUser: User
}

export const Header = (props: HeaderProps) => {
    const navigate = useNavigate();
    const {activeItem, currentUser} = props;
    const handleLogout = (): void => {
        console.log('Benutzer loggt sich aus...');
        // Logik für Authentifizierungs-Reset hier einfügen
    };

    const onItemSelected = (item: NavItem): void => {
        navigate(item.link)
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
                    {/** TODO: Hier muss noch der Pfad für die Breadcrumb verwendet werden */}
                    <Breadcrumb path={[activeItem]} />
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