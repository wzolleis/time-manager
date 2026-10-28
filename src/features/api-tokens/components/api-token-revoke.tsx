import type {ApiTokenRow} from "@features/api-tokens/use-cases/use-show-api-tokens";
import {useRevokeAnyApiToken} from "@features/api-tokens/use-cases/use-revoke-any-api-token";
import {useRevokeApiToken} from "@features/api-tokens/use-cases/use-revoke-api-token";
import {ErrorText} from "@/components/text/error-text";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

export type ApiTokenScope = "own" | "all";

export function ApiTokenRevoke({token, scope}: {token: ApiTokenRow; scope: ApiTokenScope}) {
    // Beide Use Cases immer aufrufen (Hook-Regeln), verwendet wird der passende
    const own = useRevokeApiToken();
    const any = useRevokeAnyApiToken();
    const {revoke, isRevoking, error, reset} = scope === "own" ? own : any;

    return (
        <div className="space-y-1">
            <div className="flex justify-end">
                <ConfirmDeleteButton
                    title={<>Token „{token.name}“ widerrufen?</>}
                    description={
                        <>
                            Ein Agent mit diesem Token wird sofort abgelehnt
                            {token.userName ? ` und kann nicht mehr für ${token.userName} arbeiten` : ""}. Das lässt
                            sich nicht rückgängig machen, es muss dann ein neues Token erzeugt werden.
                        </>
                    }
                    onConfirm={() => revoke(token.id)}
                    onOpen={() => reset()}
                    pending={isRevoking}
                    label="Widerrufen"
                    pendingLabel="Widerrufe…"
                />
            </div>

            {error && <ErrorText className="text-right">{error.message}</ErrorText>}
        </div>
    );
}
