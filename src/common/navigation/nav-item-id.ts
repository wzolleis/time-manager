import type {ValuesOf} from "@/common/types.ts";

export const navItemIds = [
    "settings",
    "dashboard",
    "timemanagement",
    "time-new"
] as const

export type NavItemId = ValuesOf<typeof navItemIds>;