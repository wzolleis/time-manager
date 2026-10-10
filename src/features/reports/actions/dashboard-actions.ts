import type {DashboardAction} from "@/components/dashboard-action/types.ts";

export const actions: DashboardAction[] = [] as const

export type ActionId = (typeof actions)[number]["id"];
