import {Box, Button, Flex, Heading } from "@radix-ui/themes";
import {UserDropdown} from "@user/components/user-dropdown.tsx";
import {Bell, Menu } from "lucide-react";
import type {User} from "@user/types.ts";

export interface HeaderProps {
    activeLabel: string
    currentUser: User
}

export const Header = (props: HeaderProps) => {
    const {activeLabel, currentUser} = props;
    const handleLogout = (): void => {
        console.log('Benutzer loggt sich aus...');
        // Logik für Authentifizierungs-Reset hier einfügen
    };

    return (
        <Flex
            justify="between"
            align="center"
            px="4"
            py="3"
            style={{background: 'var(--color-background)', borderBottom: '1px solid var(--gray-4)'}}
        >
            <Flex align="center" gap="3">
                <Box display={{md: 'none'}}>
                    <Button variant="ghost" size="2">
                        <Menu size={20}/>
                    </Button>
                </Box>
                <Box display={{initial: 'none', sm: 'block'}}>
                    <Heading size="3" color="gray">
                        {activeLabel}
                    </Heading>
                </Box>

            </Flex>

            <Flex align="center" gap="3">
                <Button variant="ghost" size="2" radius="full">
                    <Bell size={18}/>
                </Button>

                {/* 2. Wiederverwendbares Dropdown */}
                <UserDropdown user={currentUser} onLogout={handleLogout}/>
            </Flex>
        </Flex>
    )
}