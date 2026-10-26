import {Menu} from "lucide-react";
import {Button} from "@radix-ui/themes";

export const MenuButton = () => {
    return (
        <Button
            variant="ghost"
            size="2"
            className="pointer-coarse:box-border! pointer-coarse:min-h-11! pointer-coarse:min-w-11!"
        >
            <Menu size={20} />
        </Button>
    );
};
