import {Link} from "@tanstack/react-router";
import {Fragment} from "react";
import {toNavNodeLinkProps} from "@/application/navigation/nav-utils";
import {ChevronRight} from "lucide-react";
import {useBreadcrumbTrail} from "@/application/breadcrumb/use-breadcrumb-trail";
import {BreadcrumbDropdown} from "@/application/breadcrumb/breadcrumb-dropdown";
import type {NavItem} from "@/application/navigation/nav-items";

export function Breadcrumb({items}: {items: NavItem[]}) {
    const trail = useBreadcrumbTrail(items);

    if (trail.length === 0) {
        return null;
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1 overflow-hidden text-sm whitespace-nowrap"
        >
            {trail.map((node, index) => {
                const isLast = index === trail.length - 1;
                const Icon = node.icon;
                const hasDropdown = node.childItems.length > 0;

                return (
                    // Name, Button und Pfeil stehen direkt in der Zeile: Fehlt der Platz, wird nur der Name des
                    // letzten Glieds gekürzt und endet mit …, alles davor behält seine Größe
                    <Fragment key={node.id}>
                        {isLast ? (
                            <span className="flex min-w-0 items-center gap-1 font-medium text-foreground">
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{node.label}</span>
                            </span>
                        ) : (
                            <Link
                                {...toNavNodeLinkProps(node)}
                                className="flex shrink-0 items-center justify-center gap-1 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                            >
                                <Icon className="h-4 w-4" />
                                {node.label}
                            </Link>
                        )}
                        {/* Der Pfeil nach unten trennt die Glieder schon, dann entfällt der Pfeil nach rechts */}
                        {hasDropdown && <BreadcrumbDropdown node={node} />}
                        {!isLast && !hasDropdown && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    </Fragment>
                );
            })}
        </nav>
    );
}
