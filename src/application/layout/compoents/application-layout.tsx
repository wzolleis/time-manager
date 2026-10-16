// Layout.tsx
import React from 'react';
import {Box, Flex, Grid, Theme} from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import Content from "@/application/layout/compoents/content";
import {Header} from "@/application/layout/header/components/header";
import {NAVIGATION_ITEMS} from "@/application/navigation/nav-items";
import {Sidebar} from "@/application/layout/sidebar/components/sidebar";

export default function ApplicationLayout(): React.JSX.Element {
    return (
        <Flex direction="column" gap="2">
            <Theme accentColor="indigo" grayColor="slate" radius="large" scaling="95%">
                <Grid columns={{initial: '1fr', md: '250px 1fr'}} style={{minHeight: '100vh'}}>

                    {/* 1. Wiederverwendbare Sidebar */}
                    <Sidebar
                        items={NAVIGATION_ITEMS}
                    />

                    {/* CONTAINER FÜR NAVBAR + CONTENT */}
                    <Flex direction="column" style={{background: 'var(--gray-2)'}}>
                        <Header/>

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
