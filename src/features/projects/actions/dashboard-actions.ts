import {BarChart3} from "lucide-react";
import type {DashboardAction} from "@/common/components/dashboard-action/types.ts";

export const actions: DashboardAction[] = [
    {
        id: "project-new",
        kind: "link",
        title: "Neues Projekt",
        description: "Neues Projekt anlegen",
        label: "Neues Projekt",
        icon: BarChart3,
        to: "/projects/new",
    }

] as const

export type ActionId = (typeof actions)[number]["id"];
