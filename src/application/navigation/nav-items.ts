import {
    BaggageClaim,
    CalendarDays,
    ClockPlus,
    LayoutDashboard,
    type LucideIcon,
    Settings,
    Target,
    User,
    WorkflowIcon
} from "lucide-react";
import type {ValuesOf} from "@/common/types.ts";
import type {LinkProps} from "@tanstack/react-router";

export const navItemIds = [
    "settings",
    "dashboard",
    "reports",
    "reports-daily",
    "reports-weekly",
    "time-stamp",
    "admin",
    "user",
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
    {id: 'admin', label: 'Administration', icon: BaggageClaim, to: '/admin', children: []},
    {id: 'settings', label: 'Einstellungen', icon: Settings, to: '/admin/settings', children: []},
    {id: 'users', label: 'Benutzer verwalten', icon: User, to: '/admin/users', children: []},
    {id: 'projects', label: 'Projekte', icon: Target, to: '/user/projects', children: []},
    {id: 'user', label: 'User', icon: User, to: '/user', children: []},
    {id: 'reports', label: 'Report', icon: WorkflowIcon, to: '/user/reports', children: []},
    {id: 'reports-daily', label: 'Heute', icon: WorkflowIcon, to: '/user/reports/daily', children: []},
    {id: 'reports-weekly', label: 'Woche', icon: CalendarDays, to: '/user/reports/weekly', children: []},
    {id: 'time-stamp', label: 'Zeiterfassung', icon: ClockPlus, to: '/user/time-stamp', children: []},

] as const

