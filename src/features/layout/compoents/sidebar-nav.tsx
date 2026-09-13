// components/SidebarNav.tsx
import React from 'react';
import {Box, Flex, Heading, Button, Avatar, Text} from '@radix-ui/themes';
import type {LucideIcon} from 'lucide-react';

export interface NavItem {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface UserProfile {
    name: string;
    email: string;
    avatarUrl?: string;
}

interface SidebarNavProps {
    items: NavItem[];
    activeId: string;
    onItemSelect: (id: string) => void;
    user: UserProfile;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
                                                          items,
                                                          activeId,
                                                          onItemSelect,
                                                          user
                                                      }) => {
    const fallbackInitials =
        user.name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <Box
            display={{initial: 'none', md: 'block'}}
            style={{borderRight: '1px solid var(--gray-4)'}}
            p="4"
        >
            <Flex direction="column" justify="between" style={{height: '100%'}}>

                {/* Logo & Items */}
                <Flex direction="column" gap="4">
                    <Heading size="4" weight="bold" mb="4">
                        AppBrand
                    </Heading>

                    <Flex direction="column" gap="1">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeId === item.id;

                            return (
                                <Flex key={item.id} justify={"start"}>
                                    <Button
                                        key={item.id}
                                        variant={isActive ? 'soft' : 'ghost'}
                                        size="3"
                                        onClick={() => onItemSelect(item.id)}
                                    >
                                        <Icon size={18} style={{marginRight: '8px'}}/>
                                        {item.label}
                                    </Button>
                                </Flex>

                            );
                        })}
                    </Flex>
                </Flex>

                {/* User Footer Profile */}
                <Flex gap="3" align="center" style={{borderTop: '1px solid var(--gray-4)', paddingTop: '16px'}}>
                    <Avatar
                        src={user.avatarUrl}
                        fallback={fallbackInitials}
                        size="2"
                        radius="full"
                    />
                    <Box>
                        <Box display={"block"}>
                            <Text size="2" weight="bold">{user.name}</Text>
                        </Box>

                        <Text size="1" color="gray">{user.email}</Text>
                    </Box>
                </Flex>

            </Flex>
        </Box>
    );
};
