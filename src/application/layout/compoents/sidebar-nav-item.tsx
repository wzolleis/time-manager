import {Button, Flex} from "@radix-ui/themes";
import type {NavItem} from "@/application/navigation/types.ts";

export interface SidebarNavItemProps {
    item: NavItem;
    isActive: boolean;
    onItemSelected: (item: NavItem) => void;
}

export const SidebarNavItem = (props: SidebarNavItemProps) => {
    const {item, isActive, onItemSelected} = props
    const Icon = item.icon;


    return (
    <Flex key={item.id} justify={"start"}>
        <Button
            key={item.id}
            variant={isActive ? 'soft' : 'ghost'}
            size="3"
            onClick={() => onItemSelected(item)}
        >
            <Icon size={18} style={{marginRight: '8px'}}/>
            {item.label}
        </Button>
    </Flex>

);
}