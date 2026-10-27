import {Link, useLocation} from "@tanstack/react-router";
import {buttonVariants} from "@/components/ui/button";
import {Muted} from "@/components/text/muted";
import {Page} from "@/components/page/page";
import {PageHeader} from "@/components/page/page-header";

export function NotFound() {
    const pathname = useLocation({select: (location) => location.pathname});

    return (
        <Page>
            <PageHeader title="Seite nicht gefunden" />
            <Muted>
                Unter <code className="rounded bg-muted px-1 py-0.5">{pathname}</code> gibt es keine Seite.
            </Muted>
            <Link to="/" className={buttonVariants({variant: "link"})}>
                Zur Startseite
            </Link>
        </Page>
    );
}
