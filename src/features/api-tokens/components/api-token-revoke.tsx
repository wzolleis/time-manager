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
import type {ApiTokenRow} from "@features/api-tokens/use-cases/use-show-api-tokens";
import {useRevokeAnyApiToken} from "@features/api-tokens/use-cases/use-revoke-any-api-token";
import {useRevokeApiToken} from "@features/api-tokens/use-cases/use-revoke-api-token";
import {ErrorText} from "@/components/text/error-text";

export type ApiTokenScope = "own" | "all";

export function ApiTokenRevoke({token, scope}: {token: ApiTokenRow; scope: ApiTokenScope}) {
    // Beide Use Cases immer aufrufen (Hook-Regeln), verwendet wird der passende
    const own = useRevokeApiToken();
    const any = useRevokeAnyApiToken();
    const {revoke, isRevoking, error, reset} = scope === "own" ? own : any;

    return (
        <div className="space-y-1">
            <div className="flex justify-end">
                <AlertDialog onOpenChange={(next) => next && reset()}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isRevoking}>
                            {isRevoking ? "Widerrufe…" : "Widerrufen"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Token „{token.name}“ widerrufen?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Ein Agent mit diesem Token wird sofort abgelehnt
                                {token.userName ? ` und kann nicht mehr für ${token.userName} arbeiten` : ""}. Das lässt
                                sich nicht rückgängig machen, es muss dann ein neues Token erzeugt werden.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({variant: "destructive"})}
                                onClick={() => revoke(token.id)}
                            >
                                Widerrufen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {error && <ErrorText className="text-right">{error.message}</ErrorText>}
        </div>
    );
}
