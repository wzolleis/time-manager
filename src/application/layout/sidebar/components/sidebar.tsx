import type {NavItem} from "@/common/navigation/types.ts";
import {buildNavTree} from "@/common/navigation/nav-utils.ts";
import {SidebarItem} from "@/application/layout/sidebar/components/sidebar-item.tsx";

export function Sidebar({items}: { items: NavItem[] }) {
    const tree = buildNavTree(items);
    return (
        <nav className="flex flex-col gap-1 w-64 p-2">
            {tree.map((node) => (
                <SidebarItem key={node.id} node={node}/>
            ))}
        </nav>
    );
}