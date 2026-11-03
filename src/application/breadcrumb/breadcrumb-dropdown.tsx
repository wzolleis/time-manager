import {Link, useRouterState} from "@tanstack/react-router";
import {Check, ChevronDown} from "lucide-react";
import {IconButton} from "@/components/buttons/icon-button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {getPath, toNavNodeLinkProps} from "@/application/navigation/nav-utils";
import type {NavNode} from "@/application/navigation/nav-items";

function isCurrent(node: NavNode, pathname: string): boolean {
    const path = getPath(node);
    return pathname === path || pathname.startsWith(`${path}/`);
}

// Die Unterseiten eines Glieds der Breadcrumb. Die Links führen ohne Zeitraum auf den aktuellen Zeitraum.
export const BreadcrumbDropdown = ({node}: {node: NavNode}) => {
    const pathname = useRouterState({select: (state) => state.location.pathname});

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <IconButton icon={ChevronDown} label={`Unterseiten von ${node.label}`} />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-auto">
                {node.childItems.map((child) => {
                    const current = isCurrent(child, pathname);
                    return (
                        <DropdownMenuItem key={child.id} asChild>
                            <Link {...toNavNodeLinkProps(child)} aria-current={current ? "page" : undefined}>
                                <child.icon />
                                {child.label}
                                {current && <Check className="ml-auto" />}
                            </Link>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
