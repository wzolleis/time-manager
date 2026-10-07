import {BarChart3} from "lucide-react";
import type {DashboardAction} from "@/common/components/dashboard-action/types.ts";

export const actions: DashboardAction[] = [
    {
        id: "report",
        kind: "link",
        title: "Report anlegen",
        description: "Neuen Report anlegen",
        label: "Report anlegen",
        icon: BarChart3,
        to: "/time-report/new",
    }

] as const

export type ActionId = (typeof actions)[number]["id"];
