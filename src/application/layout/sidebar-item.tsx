import {useState} from "react";
import {Link} from "@tanstack/react-router";
import {ChevronDown} from "lucide-react";
import {toNavNodeLinkProps} from "@/application/navigation/nav-utils";
import type {NavNode} from "@/application/navigation/nav-items";

export function SidebarItem({node, onNavigate}: {node: NavNode; onNavigate?: () => void}) {
    const {label, icon: Icon, childItems} = node;
    const hasChildren = childItems.length > 0;
    const [open, setOpen] = useState(true);

    const linkProps = toNavNodeLinkProps(node);

    return (
        <div>
            <div className="flex items-center">
                <Link
                    {...linkProps}
                    onClick={onNavigate}
                    className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                    activeProps={{className: "bg-muted text-primary"}}
                >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                </Link>
                {hasChildren && (
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        className="p-2 pointer-coarse:p-3.5 rounded-md hover:bg-muted"
                        aria-label={open ? "Einklappen" : "Ausklappen"}
                    >
                        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                )}
            </div>

            {hasChildren && open && (
                <div className="ml-6 mt-1 flex flex-col gap-1 border-l pl-3">
                    {childItems.map((child) => (
                        <SidebarItem key={child.id} node={child} onNavigate={onNavigate} />
                    ))}
                </div>
            )}
        </div>
    );
}
