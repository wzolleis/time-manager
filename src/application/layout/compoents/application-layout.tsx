// Layout.tsx
import React, {useState} from 'react';
import {Box, Flex, Grid, Theme} from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import {SidebarNav} from "@/application/layout/compoents/sidebar-nav.tsx";
import Content from "@/application/layout/compoents/content.tsx";
import {Header} from "@/application/layout/compoents/header.tsx";
import {DEFAULT_NAVIGATION_ITEM, NAVIGATION_ITEMS} from "@/application/navigation/nav-items.ts";
import {useNavigate} from "@tanstack/react-router";
import type {NavItem} from "@/application/navigation/types.ts";
import {CURRENT_USER} from "@user/types.ts";

export default function ApplicationLayout(): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const activeItem = NAVIGATION_ITEMS.find(item => item.id === activeTab) ?? DEFAULT_NAVIGATION_ITEM
    const navigate = useNavigate();

    const onItemSelected = (item: NavItem): void => {
        setActiveTab(item.id)
        void navigate({...item.link})
    }

    return (
        <Flex direction="column" gap="2">
            <Theme accentColor="indigo" grayColor="slate" radius="large" scaling="95%">
                <Grid columns={{initial: '1fr', md: '250px 1fr'}} style={{minHeight: '100vh'}}>

                    {/* 1. Wiederverwendbare Sidebar */}
                    <SidebarNav
                        items={NAVIGATION_ITEMS}
                        activeId={activeTab}
                        onItemSelected={onItemSelected}
                        user={CURRENT_USER}
                    />

                    {/* CONTAINER FÜR NAVBAR + CONTENT */}
                    <Flex direction="column" style={{background: 'var(--gray-2)'}}>
                        <Header activeItem={activeItem} currentUser={CURRENT_USER}/>

                        {/* CONTENT BEREICH */}
                        <Box p="6" style={{flexGrow: 1, overflowY: 'auto'}}>
                            {/* Hier steht der Inhalt der aktuellen route */}
                            <Content/>
                        </Box>

                    </Flex>
                </Grid>
            </Theme>
        </Flex>
    );
}
