import {Link} from "@tanstack/react-router";
import {toLinkProps} from "@/application/navigation/nav-utils";
import {ChevronRight} from "lucide-react";
import {useBreadcrumbTrail} from "@/application/breadcrumb/use-breadcrumb-trail";
import type {NavItem} from "@/application/navigation/nav-items";

export function Breadcrumb({items}: {items: NavItem[]}) {
    const trail = useBreadcrumbTrail(items);

    if (trail.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
            {trail.map((item, index) => {
                const isLast = index === trail.length - 1;
                const Icon = item.icon;

                return (
                    <span key={item.id} className="flex items-center gap-1">
                        {isLast ? (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                {...toLinkProps(item)}
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        )}
                        {!isLast && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </span>
                );
            })}
        </nav>
    );
}
