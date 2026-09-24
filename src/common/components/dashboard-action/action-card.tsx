import type {DashboardAction} from "@/common/components/dashboard-action/types.ts";
import {Card, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button, buttonVariants} from "@/components/ui/button.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog.tsx";

export function ActionCard({
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