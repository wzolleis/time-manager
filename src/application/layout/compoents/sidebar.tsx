import {ChevronDown} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {useState} from "react";
import type {NavItem, NavNode} from "@/application/navigation/types.ts";
import {buildNavTree} from "@/application/navigation/nav-utils.ts";

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

function SidebarItem({node, depth = 0}: { node: NavNode; depth?: number }) {
    const {label, icon: Icon, childItems, ...linkProps} = node;
    const hasChildren = childItems.length > 0;
    const [open, setOpen] = useState(true);

    return (
        <div>
            <div className="flex items-center">
                <Link
                    {...linkProps}
                    className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                    activeProps={{className: "bg-muted text-primary"}}
                >
                    <Icon className="h-4 w-4 shrink-0"/>
                    <span>{label}</span>
                </Link>
                {hasChildren && (
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        className="p-2 rounded-md hover:bg-muted"
                        aria-label={open ? "Einklappen" : "Ausklappen"}
                    >
                        <ChevronDown
                            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                    </button>
                )}
            </div>

            {hasChildren && open && (
                <div className="ml-6 mt-1 flex flex-col gap-1 border-l pl-3">
                    {childItems.map((child) => (
                        <SidebarItem key={child.id} node={child} depth={depth + 1}/>
                    ))}
                </div>
            )}
        </div>
    );
}