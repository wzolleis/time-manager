import {useRouterState} from "@tanstack/react-router";
import {useMemo} from "react";
import {buildNavTree, findBreadcrumbTrail} from "@/application/navigation/nav-utils";
import type {NavItem, NavNode} from "@/application/navigation/nav-items";

// Der Pfad zur aktuellen Seite als Knoten des Navigationsbaums, jeder mit seinen Unterseiten (childItems)
export function useBreadcrumbTrail(items: NavItem[]): NavNode[] {
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });
    const tree = useMemo(() => buildNavTree(items), [items]);

    return findBreadcrumbTrail(tree, pathname) ?? [];
}
