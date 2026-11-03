import type {ReactNode} from "react";
import {ErrorText} from "@/components/text/error-text";

type RowActionsProps = {
    children: ReactNode; // die Buttons der Zeile
    error?: Error | null; // Fehler einer Aktion, z. B. beim Löschen, rechtsbündig unter den Buttons
};

/** Buttons einer Tabellenzeile rechtsbündig, auf schmalen Bildschirmen umgebrochen */
export function RowActions({children, error}: RowActionsProps) {
    return (
        <div className="space-y-1">
            <div className="flex flex-wrap justify-end gap-2">{children}</div>
            {error && <ErrorText className="text-right">{error.message}</ErrorText>}
        </div>
    );
}
