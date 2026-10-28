import type {ComponentProps} from "react";
import {Menu} from "lucide-react";
import {Button} from "@/components/ui/button";

// Auf Touch-Geräten 44 px groß, damit der Finger den Button sicher trifft.
// -mx-2 zieht das Icon an die Inhaltskante, wie es Ghost-Buttons in Radix Themes tun.
export const MenuButton = (props: Omit<ComponentProps<typeof Button>, "className">) => {
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label="Menü öffnen"
            className="-mx-2 pointer-coarse:size-11"
            {...props}
        >
            <Menu className="size-5" />
        </Button>
    );
};
