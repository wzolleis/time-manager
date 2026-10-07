import {BarChart3, PlusCircle} from "lucide-react";
import type {DashboardAction} from "@/common/components/dashboard-action/types.ts";

export const actions: DashboardAction[] = [
    {
        id: "report",
        kind: "link",
        title: "Report",
        description: "Auswertungen und Kennzahlen der letzten 30 Tage ansehen.",
        label: "Report öffnen",
        icon: BarChart3,
        to: "/time/reports",
    },
    {
        id: "time-stamp",
        kind: "link",
        title: "Zeiterfassung",
        description: "Arbeitszeit erfassen und einem Projekt zuordnen",
        label: "Zeiterfassung",
        icon: PlusCircle,
        to: "/time-stamp",
    },

] as const

export type ActionId = (typeof actions)[number]["id"];
