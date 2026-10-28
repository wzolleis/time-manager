import {DropdownMenu} from "@radix-ui/themes";
import {Settings} from "lucide-react";
import {IconButton} from "@/components/buttons/icon-button";
import {navItemsOf, type NavItem} from "@/application/navigation/nav-items";

// Das Administrator-Menü oben rechts neben dem Avatar. Ob der User es sieht, entscheidet der Header.
export const AdminDropdown = ({onItemSelected}: {onItemSelected: (item: NavItem) => void}) => (
    <DropdownMenu.Root>
        <DropdownMenu.Trigger>
            <IconButton icon={Settings} label="Administration" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Content variant="soft">
            {navItemsOf("admin").map((item) => (
                <DropdownMenu.Item key={item.id} onClick={() => onItemSelected(item)}>
                    <item.icon size={14} style={{marginRight: "6px"}} /> {item.label}
                </DropdownMenu.Item>
            ))}
        </DropdownMenu.Content>
    </DropdownMenu.Root>
);
