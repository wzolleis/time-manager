import {Button} from "@/components/ui/button";

/** Fehlermeldung beim Laden eines Berichts mit der Möglichkeit, es erneut zu versuchen */
export function ReportError({error, onRetry}: {error: Error; onRetry: () => void}) {
    return (
        <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
                {error.message}
            </p>
            <Button variant="outline" onClick={onRetry}>
                Erneut versuchen
            </Button>
        </div>
    );
}
