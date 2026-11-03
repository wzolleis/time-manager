import type {ReactNode} from "react";
import type {ConfirmAction} from "@/components/dashboard-action/types";
import {buttonVariants} from "@/components/ui/button";
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

/** Fragt vor einer Aktion nach. trigger ist der Button, der den Dialog öffnet. */
export function ConfirmActionDialog({
    action,
    onConfirm,
    trigger,
}: {
    action: ConfirmAction;
    onConfirm: (id: string) => void;
    trigger: ReactNode;
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{action.confirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>{action.confirmText}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                        className={buttonVariants({variant: "destructive"})}
                        onClick={() => onConfirm(action.id)}
                    >
                        {action.confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
