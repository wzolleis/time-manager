import {
    BaggageClaim,
    CalendarClock,
    CalendarDays,
    CalendarHeart,
    CalendarRange,
    CalendarSearch,
    Fingerprint,
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
    "users",
    "holidays-admin",
    "holidays",
    "vacations",
    "sick-leaves",
    "projects",
    "projects-new",
    "api-tokens-admin",
    "api-tokens",
    "passkeys",
    "user-settings",
] as const;
export type NavItemId = ValuesOf<typeof navItemIds>;

/**
 * Wo der Eintrag steht: in der Navigationsleiste links, im Administrator-Menü (Zahnrad oben rechts,
 * nur mit Rolle Administrator) oder im Avatar-Menü oben rechts
 */
export type NavMenu = "sidebar" | "admin" | "avatar";

/**
 * Navigationseintrag für eine flache Liste
 */
export type NavItem = {
    id: NavItemId;
    label: string;
    icon: LucideIcon;
    menu: NavMenu;
} & LinkProps;

/**
 * Die Items werden in einen Knoten in einem Navigationsbaum umgewandelt
 * Das Item bekommt die untergordneten Items im Pfad als childItems
 * (children war schon als Name vergeben)
 */
export type NavNode = NavItem & {
    childItems: NavNode[];
};
// Die Reihenfolge innerhalb eines Menüs ist die Reihenfolge der Anzeige
export const NAVIGATION_ITEMS: NavItem[] = [
    {id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", menu: "sidebar", children: []},
    {id: "reports", label: "Report", icon: WorkflowIcon, to: "/user/reports", menu: "sidebar", children: []},
    {
        id: "reports-daily",
        label: "Heute",
        icon: CalendarClock,
        to: "/user/reports/daily",
        menu: "sidebar",
        children: [],
    },
    {
        id: "reports-weekly",
        label: "Woche",
        icon: CalendarDays,
        to: "/user/reports/weekly",
        menu: "sidebar",
        children: [],
    },
    {
        id: "reports-monthly",
        label: "Monat",
        icon: CalendarRange,
        to: "/user/reports/monthly",
        menu: "sidebar",
        children: [],
    },
    {
        id: "reports-yearly",
        label: "Jahr",
        icon: CalendarSearch,
        to: "/user/reports/yearly",
        menu: "sidebar",
        children: [],
    },
    {
        id: "reports-overtime",
        label: "Überstunden",
        icon: RotateCcwClock,
        to: "/user/reports/overtime",
        menu: "sidebar",
        children: [],
    },
    {id: "vacations", label: "Urlaube", icon: Parasol, to: "/user/vacations", menu: "sidebar", children: []},
    {
        id: "sick-leaves",
        label: "Krankmeldungen",
        icon: Thermometer,
        to: "/user/sick-leaves",
        menu: "sidebar",
        children: [],
    },
    {id: "holidays", label: "Feiertage", icon: CalendarHeart, to: "/user/holidays", menu: "sidebar", children: []},
    {id: "projects", label: "Projekte", icon: Target, to: "/user/projects", menu: "sidebar", children: []},
    {id: "api-tokens", label: "Agent-Zugang", icon: KeyRound, to: "/user/api-tokens", menu: "sidebar", children: []},
    {id: "passkeys", label: "Passkeys", icon: Fingerprint, to: "/user/passkeys", menu: "sidebar", children: []},
    {id: "user-settings", label: "Einstellungen", icon: Settings, to: "/user/settings", menu: "avatar", children: []},
    {id: "admin", label: "Administration", icon: BaggageClaim, to: "/admin", menu: "admin", children: []},
    {id: "settings", label: "Einstellungen", icon: Settings, to: "/admin/settings", menu: "admin", children: []},
    {id: "users", label: "Benutzer verwalten", icon: User, to: "/admin/users", menu: "admin", children: []},
    {id: "holidays-admin", label: "Feiertage", icon: CalendarHeart, to: "/admin/holidays", menu: "admin", children: []},
    {
        id: "api-tokens-admin",
        label: "Agent-Zugänge",
        icon: KeyRound,
        to: "/admin/api-tokens",
        menu: "admin",
        children: [],
    },
] as const;

export const navItemsOf = (menu: NavMenu): NavItem[] => NAVIGATION_ITEMS.filter((item) => item.menu === menu);
