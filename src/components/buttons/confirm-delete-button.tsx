import type {ReactNode} from "react";
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

type ConfirmDeleteButtonProps = {
    title: ReactNode;
    description: ReactNode;
    onConfirm: () => void;
    onOpen?: () => void; // z. B. einen alten Fehler zurücksetzen
    pending?: boolean; // sperrt den Button, solange gelöscht wird
    label?: string;
    pendingLabel?: string;
};

/** Roter Button, der erst nach Bestätigung in einem Dialog löscht */
export function ConfirmDeleteButton({
    title,
    description,
    onConfirm,
    onOpen,
    pending = false,
    label = "Löschen",
    pendingLabel = "Lösche…",
}: ConfirmDeleteButtonProps) {
    return (
        <AlertDialog onOpenChange={(next) => next && onOpen?.()}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={pending}>
                    {pending ? pendingLabel : label}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction className={buttonVariants({variant: "destructive"})} onClick={onConfirm}>
                        {label}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
