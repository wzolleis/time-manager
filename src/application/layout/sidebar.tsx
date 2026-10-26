import {buildNavTree} from "@/application/navigation/nav-utils";
import {SidebarItem} from "@/application/layout/sidebar-item";
import type {NavItem} from "@/application/navigation/nav-items";

// onNavigate: z. B. um das mobile Menü nach einem Klick zu schließen
export function Sidebar({items, onNavigate}: {items: NavItem[]; onNavigate?: () => void}) {
    const tree = buildNavTree(items);
    return (
        <nav className="flex flex-col gap-1 w-64 p-2">
            {tree.map((node) => (
                <SidebarItem key={node.id} node={node} onNavigate={onNavigate} />
            ))}
        </nav>
    );
}
