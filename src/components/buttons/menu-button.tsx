import type {ComponentProps} from "react";
import {Menu} from "lucide-react";
import {Button} from "@radix-ui/themes";

export const MenuButton = (props: Omit<ComponentProps<typeof Button>, "className">) => {
    return (
        <Button
            variant="ghost"
            size="2"
            aria-label="Menü öffnen"
            className="pointer-coarse:box-border! pointer-coarse:min-h-11! pointer-coarse:min-w-11!"
            {...props}
        >
            <Menu size={20} />
        </Button>
    );
};
