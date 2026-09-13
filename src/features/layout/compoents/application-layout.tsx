// Layout.tsx
import React, { useState } from 'react';
import { Theme, Grid, Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { LayoutDashboard, Settings, Users, Bell, Menu } from 'lucide-react';
import {type NavItem, SidebarNav} from "@layout/compoents/sidebar-nav.tsx";
import {UserDropdown} from "@user/components/user-dropdown.tsx";
import Content from "@layout/compoents/content.tsx";

// Eigene Komponenten importieren

const NAVIGATION_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'team', label: 'Team', icon: Users },
    {id: 'User Management', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
];

const CURRENT_USER = {
    name: 'Jack Schmidt',
    email: 'admin@example.com',
    avatarUrl: 'https://unsplash.com'
};

export default function ApplicationLayout(): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<string>('dashboard');

    const handleLogout = (): void => {
        console.log('Benutzer loggt sich aus...');
        // Logik für Authentifizierungs-Reset hier einfügen
    };

    const activeLabel = NAVIGATION_ITEMS.find(item => item.id === activeTab)?.label || 'Übersicht';

    return (
        <Theme accentColor="indigo" grayColor="slate" radius="large" scaling="95%">
            <Grid columns={{ initial: '1fr', md: '250px 1fr' }} style={{ minHeight: '100vh' }}>

                {/* 1. Wiederverwendbare Sidebar */}
                <SidebarNav
                    items={NAVIGATION_ITEMS}
                    activeId={activeTab}
                    onItemSelect={setActiveTab}
                    user={CURRENT_USER}
                />

                {/* CONTAINER FÜR NAVBAR + CONTENT */}
                <Flex direction="column" style={{ background: 'var(--gray-2)' }}>

                    {/* TOP NAVBAR */}
                    <Flex
                        justify="between"
                        align="center"
                        px="4"
                        py="3"
                        style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--gray-4)' }}
                    >
                        <Flex align="center" gap="3">
                            <Box display={{ md: 'none' }}>
                                <Button variant="ghost" size="2">
                                    <Menu size={20} />
                                </Button>
                            </Box>
                            <Box display={{ initial: 'none', sm: 'block' }}>
                                <Heading size="3" color="gray">
                                    {activeLabel}
                                </Heading>
                            </Box>

                        </Flex>

                        <Flex align="center" gap="3">
                            <Button variant="ghost" size="2" radius="full">
                                <Bell size={18} />
                            </Button>

                            {/* 2. Wiederverwendbares Dropdown */}
                            <UserDropdown user={CURRENT_USER} onLogout={handleLogout} />
                        </Flex>
                    </Flex>

                    {/* CONTENT BEREICH */}
                    <Box p="6" style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Heading size="6" mb="2">Willkommen zurück, {CURRENT_USER.name}!</Heading>
                        <Content activeLabel={activeLabel}/>

                        {/* Hier können dynamische Dashboard-Inhalte geladen werden */}
                    </Box>

                </Flex>
            </Grid>
        </Theme>
    );
}
