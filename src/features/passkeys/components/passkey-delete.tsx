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
import type {Passkey} from "@shared/passkey";
import {useDeletePasskey} from "@features/passkeys/use-cases/use-delete-passkey";

export function PasskeyDelete({passkey}: {passkey: Passkey}) {
    const {remove, isDeleting, error, reset} = useDeletePasskey();

    return (
        <div className="space-y-1">
            <div className="flex justify-end">
                <AlertDialog onOpenChange={(next) => next && reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDeleting}>
                            {isDeleting ? "Lösche…" : "Löschen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Passkey „{passkey.name}“ löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Mit diesem Passkey ist danach keine Anmeldung mehr möglich. Im Passwortmanager des
                                Geräts bleibt er stehen, dort kannst du ihn selbst entfernen.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => remove(passkey.id)}
                            >
                                Löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {error && (
                <p role="alert" className="text-right text-sm text-destructive">
                    {error.message}
                </p>
            )}
        </div>
    );
}
