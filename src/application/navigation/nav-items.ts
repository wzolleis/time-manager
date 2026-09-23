import {LayoutDashboard, Settings, WorkflowIcon} from "lucide-react";
import type {NavItem} from "@/application/navigation/types.ts";

export const NAVIGATION_ITEMS: NavItem[] = [
    {
        id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, link: {
            to: '/dashboard',
        }
    },
    {id: 'settings', label: 'Einstellungen', icon: Settings, link: {to: '/settings'}},
    {id: 'timemanagement', label: 'Arbeitszeiten', icon: WorkflowIcon, link: {to: '/time-management'}},
];



export const findNavigationItem = (id: string): NavItem => {
    return NAVIGATION_ITEMS.find(item => item.id === id)!
}

export const DEFAULT_NAVIGATION_ITEM: NavItem = findNavigationItem('dashboard')
