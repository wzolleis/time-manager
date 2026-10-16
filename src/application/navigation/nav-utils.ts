import {NAVIGATION_ITEMS, type NavItem, type NavNode} from "@/application/navigation/nav-items";
import type {LinkProps} from "@tanstack/react-router";


export function toLinkProps(item: NavItem): LinkProps {
    const {...linkProps} = item;
    return linkProps;
}

export function toNavNodeLinkProps(node: NavNode): LinkProps {
    const {childItems: _childItems, ...item} = node;
    return toLinkProps(item);
}


export const findNavigationItem = (id: string): NavItem => {
    return NAVIGATION_ITEMS.find(item => item.id === id)!
}

export function getPath(item: NavItem): string {
    return typeof item.to === "string" ? item.to : "";
}

function getDepth(path: string): number {
    return path.split("/").filter(Boolean).length;
}

function isTopLevel(item: NavItem): boolean {
    return getDepth(getPath(item)) <= 1;
}

function isDirectChildOf(item: NavItem, parent: NavItem): boolean {
    const itemPath = getPath(item);
    const parentPath = getPath(parent);
    return (
        itemPath !== parentPath &&
        itemPath.startsWith(`${parentPath}/`) &&
        getDepth(itemPath) === getDepth(parentPath) + 1
    );
}

function createNavNode(item: NavItem, allItems: NavItem[]): NavNode {
    const childItems: NavNode[] = allItems
        .filter((candidate) => isDirectChildOf(candidate, item))
        .map((child) => createNavNode(child, allItems));

    return {...item, childItems};
}

export function buildNavTree(items: NavItem[]): NavNode[] {
    const roots = items.filter(isTopLevel);
    return roots.map((root) => createNavNode(root, items));
}

export function findBreadcrumbTrail(
    nodes: NavNode[],
    pathname: string
): NavNode[] | null {
    for (const node of nodes) {
        const nodePath = getPath(node);

        if (pathname === nodePath) {
            return [node];
        }

        if (pathname.startsWith(`${nodePath}/`)) {
            const childTrail = findBreadcrumbTrail(node.childItems, pathname);
            if (childTrail) {
                return [node, ...childTrail];
            }
            // Pfad liegt unterhalb des Knotens, aber kein Kind matcht exakt
            // (z.B. "/time/new/123" ohne eigenes NavItem) -> Knoten trotzdem anzeigen
            return [node];
        }
    }
    return null;
}