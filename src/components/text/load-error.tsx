import {Button} from "@/components/ui/button";
import {ErrorText} from "@/components/text/error-text";
import {cn} from "@/lib/utils";

/** Fehlermeldung beim Laden mit der Möglichkeit, es erneut zu versuchen */
export function LoadError({error, onRetry, className}: {error: Error; onRetry: () => void; className?: string}) {
    return (
        <div className={cn("space-y-2", className)}>
            <ErrorText>{error.message}</ErrorText>
            <Button variant="outline" onClick={onRetry}>
                Erneut versuchen
            </Button>
        </div>
    );
}
