import {LayoutDashboard, Settings, Timer, WorkflowIcon} from "lucide-react";
import type {NavItem} from "@/common/navigation/types.ts";

export const NAVIGATION_ITEMS: NavItem[] = [
    {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', children: []},
    {id: 'settings', label: 'Einstellungen', icon: Settings, to: '/settings', children: []},
    {id: 'timemanagement', label: 'Arbeitszeiten', icon: WorkflowIcon, to: '/time', children: []},
    {id: 'time-new', label: 'Neue Zeit eintragen ', icon: Timer, to: '/time/new', children: []},
] as const
