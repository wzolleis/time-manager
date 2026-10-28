import type {ComponentProps} from "react";
import type {LucideIcon} from "lucide-react";
import {Button} from "@/components/ui/button";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "className" | "children"> & {
    icon: LucideIcon;
    // Ohne sichtbaren Text: wird zu aria-label und Tooltip
    label: string;
};

// Ein Button nur mit Icon, auf Touch-Geräten 44 px groß, damit der Finger ihn sicher trifft.
export const IconButton = ({icon: Icon, label, ...props}: IconButtonProps) => {
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            className="pointer-coarse:size-11"
            {...props}
        >
            <Icon className="size-5" />
        </Button>
    );
};
