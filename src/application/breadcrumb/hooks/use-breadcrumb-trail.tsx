import {useRouterState} from "@tanstack/react-router";
import {useMemo} from "react";
import {getPath} from "@/application/navigation/nav-utils.ts";
import type {NavItem} from "@/application/navigation/nav-items.ts";

function buildPathMap(items: NavItem[]): Map<string, NavItem> {
    return new Map(items.map((item) => [getPath(item), item]));
}

function getPathSegments(pathname: string): string[] {
    return pathname.split("/").filter(Boolean);
}

function buildPrefixPaths(pathname: string): string[] {
    const segments = getPathSegments(pathname);
    return segments.map((_, index) => "/" + segments.slice(0, index + 1).join("/"));
}


export function useBreadcrumbTrail(items: NavItem[]): NavItem[] {
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });
    const pathMap = useMemo(() => buildPathMap(items), [items]);

    return buildPrefixPaths(pathname)
        .map((prefix) => pathMap.get(prefix))
        .filter((item): item is NavItem => item !== undefined);
}