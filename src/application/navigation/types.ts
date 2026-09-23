import type {LucideIcon} from "lucide-react";
import type {ValidateLinkOptions} from "@tanstack/react-router";

export interface NavItem {
    id: string;
    label: string;
    icon: LucideIcon;
    link: ValidateLinkOptions

}