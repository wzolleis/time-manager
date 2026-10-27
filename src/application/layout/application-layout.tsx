// Layout.tsx
import React from "react";
import {Box, Flex, Grid, Theme} from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import Content from "@/application/layout/content";
import {Header} from "@/application/layout/header";
import {NAVIGATION_ITEMS} from "@/application/navigation/nav-items";
import {Sidebar} from "@/application/layout/sidebar";

export default function ApplicationLayout(): React.JSX.Element {
    return (
        <Flex direction="column" gap="2">
            <Theme accentColor="indigo" grayColor="slate" radius="large" scaling="95%">
                {/* minmax(0, 1fr): breiter Inhalt (Tabellen) darf das Layout und damit den Header nicht verbreitern */}
                <Grid columns={{initial: "minmax(0, 1fr)", md: "250px minmax(0, 1fr)"}} style={{minHeight: "100vh"}}>
                    {/* 1. Wiederverwendbare Sidebar (unterhalb von md im Hamburger-Menü des Headers) */}
                    <Box display={{initial: "none", md: "block"}}>
                        <Sidebar items={NAVIGATION_ITEMS} />
                    </Box>

                    {/* CONTAINER FÜR NAVBAR + CONTENT */}
                    <Flex direction="column" style={{background: "var(--gray-2)"}}>
                        <Header />

                        {/* CONTENT BEREICH */}
                        <Box p={{initial: "3", sm: "6"}} style={{flexGrow: 1, overflowX: "auto", overflowY: "auto"}}>
                            {/* Hier steht der Inhalt der aktuellen route */}
                            <Content />
                        </Box>
                    </Flex>
                </Grid>
            </Theme>
        </Flex>
    );
}
