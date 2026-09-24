// Benötigte shadcn-Komponenten:
// npx shadcn@latest add button card alert-dialog

import {BarChart3, type LucideIcon, PlusCircle, Trash2} from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button, buttonVariants} from "@/components/ui/button";
import {Card, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card";

/* ---------- Typen ---------- */

type ActionBase = {
    id: string;
    title: string;
    description: string;
    label: string;
    icon: LucideIcon;
};

// Springt zu einer anderen Seite
type LinkAction = ActionBase & {
    kind: "link";
    href: string;
};

// Braucht eine Bestätigung, bevor etwas passiert
type ConfirmAction = ActionBase & {
    kind: "confirm";
    confirmTitle: string;
    confirmText: string;
};

type DashboardAction = LinkAction | ConfirmAction;

/* ---------- Konfiguration ---------- */

const actions = [
    {
        id: "report",
        kind: "link",
        title: "Report",
        description: "Auswertungen und Kennzahlen der letzten 30 Tage ansehen.",
        label: "Report öffnen",
        icon: BarChart3,
        href: "/reports",
    },
    {
        id: "create-item",
        kind: "link",
        title: "Neues Item",
        description: "Ein neues Item mit allen Angaben anlegen.",
        label: "Item anlegen",
        icon: PlusCircle,
        href: "/items/new",
    },
    {
        id: "delete-items",
        kind: "confirm",
        title: "Löschen",
        description: "Ausgewählte Items dauerhaft entfernen.",
        label: "Items löschen",
        icon: Trash2,
        confirmTitle: "Items wirklich löschen?",
        confirmText:
            "Die ausgewählten Items werden dauerhaft gelöscht. Das lässt sich nicht rückgängig machen.",
    },
] as const satisfies readonly DashboardAction[];

// Union der Ids: "report" | "create-item" | "delete-items"
export type ActionId = (typeof actions)[number]["id"];

/* ---------- Komponenten ---------- */

function ActionCard({
                        action,
                        onConfirm,
                    }: {
    action: DashboardAction;
    onConfirm: (id: string) => void;
}) {
    const Icon = action.icon;
    const isDestructive = action.kind === "confirm";

    return (
        <Card className="flex flex-col justify-between">
            <CardHeader>
                <div
                    className={
                        isDestructive
                            ? "mb-2 flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive"
                            : "mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"
                    }
                >
                    <Icon className="size-5" aria-hidden/>
                </div>
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
            </CardHeader>

            <CardFooter>
                {action.kind === "link" ? (
                    // asChild: Der Button rendert den Link, so bleibt es ein echtes <a>
                    <Button asChild className="w-full">
                        <a href={action.href}>{action.label}</a>
                    </Button>
                ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                                {action.label}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{action.confirmTitle}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {action.confirmText}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                    className={buttonVariants({variant: "destructive"})}
                                    onClick={() => onConfirm(action.id)}
                                >
                                    Löschen
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardFooter>
        </Card>
    );
}

export function TimeManagementHome() {
    const handleConfirm = (id: string) => {
        // Hier den eigentlichen API-Aufruf einbauen
        console.log("Bestätigt:", id);
    };

    return (
        <main className="mx-auto max-w-5xl p-6">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Was möchtest du als Nächstes tun?</p>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {actions.map((action) => (
                    <ActionCard
                        key={action.id}
                        action={action}
                        onConfirm={handleConfirm}
                    />
                ))}
            </section>
        </main>
    );
}
