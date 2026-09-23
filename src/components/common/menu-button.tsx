import {Menu} from "lucide-react";
import {Button} from "@radix-ui/themes";

export const MenuButton = () => {
    return (
        <Button variant="ghost" size="2">
            <Menu size={20}/>
        </Button>
    )
}