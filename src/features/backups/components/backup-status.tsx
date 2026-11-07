import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";
import {formatDateTime} from "@shared/format";

type Props = {
    warnings: string[];
    configured: boolean;
    lastCopiedAt: Date | string | null;
};

/** Warnungen zum Backup und das Datum der letzten Kopie */
export function BackupStatus({warnings, configured, lastCopiedAt}: Props) {
    if (!configured) {
        return (
            <Muted>
                In dieser Umgebung ist das Backup nicht eingerichtet, es fehlen die Zugangsdaten zum Backup-Speicher.
            </Muted>
        );
    }

    return (
        <div className="space-y-1">
            {/* Kein role="alert": die Warnungen stehen schon beim Laden der Seite da */}
            {warnings.map((warning) => (
                <ErrorText key={warning} alert={false}>
                    {warning}
                </ErrorText>
            ))}
            {lastCopiedAt && <Muted>Zuletzt auf einen Rechner kopiert: {formatDateTime(lastCopiedAt)}</Muted>}
        </div>
    );
}
