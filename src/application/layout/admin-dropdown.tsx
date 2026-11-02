import {Settings} from "lucide-react";
import {IconButton} from "@/components/buttons/icon-button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {navItemsOf, type NavItem} from "@/application/navigation/nav-items";

// Das Administrator-Menü oben rechts neben dem Avatar. Ob der User es sieht, entscheidet der Header.
export const AdminDropdown = ({onItemSelected}: {onItemSelected: (item: NavItem) => void}) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <IconButton icon={Settings} label="Administration" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-auto">
            {navItemsOf("admin").map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => onItemSelected(item)}>
                    <item.icon /> {item.label}
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
);
