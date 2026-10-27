import {Link, useLocation} from "@tanstack/react-router";
import {buttonVariants} from "@/components/ui/button";
import {Muted} from "@/components/text/muted";

export function NotFound() {
    const pathname = useLocation({select: (location) => location.pathname});

    return (
        <div className="space-y-4 p-4">
            <h1 className="text-2xl font-semibold">Seite nicht gefunden</h1>
            <Muted>
                Unter <code className="rounded bg-muted px-1 py-0.5">{pathname}</code> gibt es keine Seite.
            </Muted>
            <Link to="/" className={buttonVariants({variant: "link"})}>
                Zur Startseite
            </Link>
        </div>
    );
}
