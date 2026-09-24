import type {LucideIcon} from "lucide-react";
import type {ValidateLinkOptions} from "@tanstack/react-router";
import type {NavItemId} from "@/application/navigation/nav-item-id.ts";

export interface NavItem {
    id: NavItemId;
    label: string;
    icon: LucideIcon;
    link: ValidateLinkOptions
}