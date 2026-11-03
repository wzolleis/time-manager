import type {ComponentProps} from "react";
import type {LucideIcon} from "lucide-react";
import {Link, type LinkProps} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "className" | "children"> & {
    icon: LucideIcon;
    // Ohne sichtbaren Text: wird zu aria-label und Tooltip
    label: string;
};

// Auf Touch-Geräten 44 px groß, damit der Finger den Button sicher trifft
const ICON_BUTTON = {variant: "ghost", size: "icon", className: "pointer-coarse:size-11"} as const;

// Ein Button nur mit Icon
export const IconButton = ({icon: Icon, label, ...props}: IconButtonProps) => {
    return (
        <Button {...ICON_BUTTON} aria-label={label} title={label} {...props}>
            <Icon className="size-5" />
        </Button>
    );
};

// Ein Link nur mit Icon, sieht aus wie IconButton und bleibt ein echtes <a>
export const IconLink = ({icon: Icon, label, to}: {icon: LucideIcon; label: string; to: LinkProps["to"]}) => (
    <Button asChild {...ICON_BUTTON}>
        <Link to={to} aria-label={label} title={label}>
            <Icon className="size-5" />
        </Link>
    </Button>
);
