// Layout.tsx
import React from "react";
import Content from "@/application/layout/content";
import {Header} from "@/application/layout/header";
import {navItemsOf} from "@/application/navigation/nav-items";
import {Sidebar} from "@/application/layout/sidebar";
import {Toaster} from "@/components/ui/sonner";
import {ActionBarContainer} from "@/application/layout/action-bar";

export default function ApplicationLayout(): React.JSX.Element {
    return (
        // minmax(0, 1fr): breiter Inhalt (Tabellen) darf das Layout und damit den Header nicht verbreitern
        <ActionBarContainer className="grid min-h-screen grid-cols-[minmax(0,1fr)] md:grid-cols-[250px_minmax(0,1fr)]">
            {/* 1. Wiederverwendbare Sidebar (unterhalb von md im Hamburger-Menü des Headers) */}
            <div className="hidden md:block">
                <Sidebar items={navItemsOf("sidebar")} />
            </div>

            {/* CONTAINER FÜR NAVBAR + CONTENT */}
            <div className="flex flex-col bg-slate-50">
                <Header />

                {/* CONTENT BEREICH */}
                <div className="grow overflow-auto p-3 sm:p-8">
                    {/* Hier steht der Inhalt der aktuellen route */}
                    <Content />
                </div>
            </div>

            {/* Meldungen, die nach dem Schließen eines Dialogs kommen, z. B. ein abgelehnter Optimistic Write */}
            {/* theme fest auf hell: die App hat keinen Dark Mode, "system" würde sonst dunkle Toasts zeigen */}
            <Toaster theme="light" richColors position="top-center" />
        </ActionBarContainer>
    );
}
