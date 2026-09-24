import type {ValuesOf} from "@/common/types.ts";

const navItemIds = [
    "settings",
    "dashboard",
    "timemanagement"
] as const

export function isNavItemId(value: string): value is NavItemId {
    return (navItemIds as readonly string[]).includes(value);
}

export type NavItemId = ValuesOf<typeof navItemIds>;