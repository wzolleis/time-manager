import {
    BaggageClaim,
    CalendarClock,
    CalendarDays,
    CalendarHeart,
    CalendarRange,
    CalendarSearch,
    KeyRound,
    LayoutDashboard,
    type LucideIcon,
    Parasol,
    RotateCcwClock,
    Settings,
    Target,
    Thermometer,
    User,
    WorkflowIcon,
} from "lucide-react";
import type {ValuesOf} from "@/common/types";
import type {LinkProps} from "@tanstack/react-router";

export const navItemIds = [
    "settings",
    "dashboard",
    "reports",
    "reports-daily",
    "reports-weekly",
    "reports-monthly",
    "reports-yearly",
    "reports-overtime",
    "admin",
    "user",
    "users",
    "holidays-admin",
    "holidays",
    "vacations",
    "sick-leaves",
    "projects",
    "projects-new",
    "api-tokens-admin",
    "api-tokens",
    "user-settings",
] as const;
export type NavItemId = ValuesOf<typeof navItemIds>;

/**
 * Navigationseintrag für eine flache Liste
 */
export type NavItem = {
    id: NavItemId;
    label: string;
    icon: LucideIcon;
} & LinkProps;

/**
 * Die Items werden in einen Knoten in einem Navigationsbaum umgewandelt
 * Das Item bekommt die untergordneten Items im Pfad als childItems
 * (children war schon als Name vergeben)
 */
export type NavNode = NavItem & {
    childItems: NavNode[];
};
export const NAVIGATION_ITEMS: NavItem[] = [
    {id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", children: []},
    {id: "admin", label: "Administration", icon: BaggageClaim, to: "/admin", children: []},
    {id: "settings", label: "Einstellungen", icon: Settings, to: "/admin/settings", children: []},
    {id: "users", label: "Benutzer verwalten", icon: User, to: "/admin/users", children: []},
    {id: "holidays-admin", label: "Feiertage", icon: CalendarHeart, to: "/admin/holidays", children: []},
    {id: "api-tokens-admin", label: "Agent-Zugänge", icon: KeyRound, to: "/admin/api-tokens", children: []},
    {id: "projects", label: "Projekte", icon: Target, to: "/user/projects", children: []},
    {id: "user", label: "User", icon: User, to: "/user", children: []},
    {id: "user-settings", label: "Einstellungen", icon: Settings, to: "/user/settings", children: []},
    {id: "holidays", label: "Feiertage", icon: CalendarHeart, to: "/user/holidays", children: []},
    {id: "vacations", label: "Urlaube", icon: Parasol, to: "/user/vacations", children: []},
    {id: "sick-leaves", label: "Krankmeldungen", icon: Thermometer, to: "/user/sick-leaves", children: []},
    {id: "reports", label: "Report", icon: WorkflowIcon, to: "/user/reports", children: []},
    {id: "reports-daily", label: "Heute", icon: CalendarClock, to: "/user/reports/daily", children: []},
    {id: "reports-weekly", label: "Woche", icon: CalendarDays, to: "/user/reports/weekly", children: []},
    {id: "reports-monthly", label: "Monat", icon: CalendarRange, to: "/user/reports/monthly", children: []},
    {id: "reports-yearly", label: "Jahr", icon: CalendarSearch, to: "/user/reports/yearly", children: []},
    {id: "reports-overtime", label: "Überstunden", icon: RotateCcwClock, to: "/user/reports/overtime", children: []},
    {id: "api-tokens", label: "Agent-Zugang", icon: KeyRound, to: "/user/api-tokens", children: []},
] as const;
