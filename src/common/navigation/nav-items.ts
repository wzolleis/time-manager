import {LayoutDashboard, type LucideIcon, Settings, Timer, WorkflowIcon} from "lucide-react";
import type {ValuesOf} from "@/common/types.ts";
import type {LinkProps} from "@tanstack/react-router";

export const navItemIds = [
    "settings",
    "dashboard",
    "time",
    "time-new",
    "time-report"
] as const
export type NavItemId = ValuesOf<typeof navItemIds>;

/**
 * Navigationseintrag für eine flache Liste
 */
export type NavItem = {
    id: NavItemId;
    label: string;
    icon: LucideIcon;
} & LinkProps

/**
 * Die Items werden in einen Knoten in einem Navigationsbaum umgewandelt
 * Das Item bekommt die untergordneten Items im Pfad als childItems
 * (children war schon als Name vergeben)
 */
export type  NavNode = NavItem & {
    childItems: NavNode[]
}
export const NAVIGATION_ITEMS: NavItem[] = [
    {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', children: []},
    {id: 'settings', label: 'Einstellungen', icon: Settings, to: '/settings', children: []},
    {id: 'time', label: 'Arbeitszeiten', icon: WorkflowIcon, to: '/time', children: []},
    {id: 'time-new', label: 'Neue Zeit eintragen', icon: Timer, to: '/time/new', children: []},
    {id: 'time-report', label: 'Zeit-Report', icon: Timer, to: '/time/reports', children: []},
] as const

