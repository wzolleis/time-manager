import {ClockPlus, LayoutDashboard, type LucideIcon, Settings, User, WorkflowIcon} from "lucide-react";
import type {ValuesOf} from "@/common/types.ts";
import type {LinkProps} from "@tanstack/react-router";

export const navItemIds = [
    "settings",
    "dashboard",
    "time-report",
    "time-report-new",
    "time-stamp",
    "users",
    "projects",
    "projects-new"
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
    {id: 'users', label: 'Benutzer verwalten', icon: User, to: '/users', children: []},
    {id: 'projects', label: 'Projekte verwalten', icon: ClockPlus, to: '/projects', children: []},
    {id: 'time-report', label: 'Reports verwalten', icon: WorkflowIcon, to: '/time-report', children: []},
    {id: 'time-report-new', label: 'Neuen Report anlegen', icon: WorkflowIcon, to: '/time-report/new', children: []},
    {id: 'time-stamp', label: 'Zeiterfassung', icon: ClockPlus, to: '/time-stamp', children: []},

] as const

