import {Link, useLocation} from "@tanstack/react-router";
import {buttonVariants} from "@/components/ui/button";

export function NotFound() {
    const pathname = useLocation({select: (location) => location.pathname});

    return (
        <div className="space-y-4 p-4">
            <h1 className="text-2xl font-semibold">Seite nicht gefunden</h1>
            <p className="text-sm text-muted-foreground">
                Unter <code className="rounded bg-muted px-1 py-0.5">{pathname}</code> gibt es keine Seite.
            </p>
            <Link to="/" className={buttonVariants({variant: "link"})}>
                Zur Startseite
            </Link>
        </div>
    );
}