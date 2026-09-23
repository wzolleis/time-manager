// components/SidebarNav.tsx
import React from 'react';
import {Box, Flex, Heading} from '@radix-ui/themes';
import type {NavItem} from "@/application/navigation/types.ts";
import {SidebarNavItem} from "@/application/layout/compoents/sidebar-nav-item.tsx";
import {UserFooterProfile} from "@user/components/user-footer-profile.tsx";
import type {User} from "@user/types.ts";

interface SidebarNavProps {
    items: NavItem[];
    activeId: string;
    onItemSelected: (item: NavItem) => void;
    user: User;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
                                                          items,
                                                          activeId,
                                                          onItemSelected,
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
                            const isActive = activeId === item.id;

                            return (
                                <SidebarNavItem
                                    key={item.id}
                                    isActive={isActive}
                                    item={item}
                                    onItemSelected={onItemSelected}/>

                            );
                        })}
                    </Flex>
                </Flex>

                {/* User Footer Profile */}
                <UserFooterProfile user={user} fallbackInitials={fallbackInitials}/>
            </Flex>
        </Box>
    );
};
