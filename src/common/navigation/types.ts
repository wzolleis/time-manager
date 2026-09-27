import type {LucideIcon} from "lucide-react";
import type {NavItemId} from "@/common/navigation/nav-item-id.ts";
import type {LinkProps} from "@tanstack/react-router";

export type NavItem = {
    id: NavItemId;
    label: string;
    icon: LucideIcon;
} & LinkProps

export type  NavNode = NavItem & {
    childItems: NavNode[]
}