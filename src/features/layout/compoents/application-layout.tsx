// Layout.tsx
import React, {useState} from 'react';
import {Box, Flex, Grid, Heading, Theme} from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import {LayoutDashboard, Settings, Users} from 'lucide-react';
import {type NavItem, SidebarNav} from "@layout/compoents/sidebar-nav.tsx";
import Content from "@layout/compoents/content.tsx";
import type {User} from "@user/types.ts";
import {Header} from "@layout/compoents/header.tsx";

// Eigene Komponenten importieren

const NAVIGATION_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'team', label: 'Team', icon: Users },
    {id: 'User Management', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
];

const CURRENT_USER: User = {
    name: 'Jack Schmidt',
    email: 'admin@example.com',
    avatarUrl: 'https://unsplash.com'
};

export default function ApplicationLayout(): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<string>('dashboard');



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
                    <Header activeLabel={activeLabel} currentUser={CURRENT_USER}/>

                    {/* TOP NAVBAR */}


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
