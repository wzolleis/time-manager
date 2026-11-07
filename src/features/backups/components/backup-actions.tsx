import {DatabaseBackup, HardDriveDownload} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ErrorText} from "@/components/text/error-text";
import {useCreateBackup} from "@features/backups/use-cases/use-create-backup";
import {useCopyBackup} from "@features/backups/use-cases/use-copy-backup";
import type {BackupRun} from "@shared/backup";

type Props = {
    newest: BackupRun | null; // das neueste Backup mit Datei, das kopiert werden kann
    configured: boolean;
};

/** Backup von Hand erstellen und das neueste auf den Rechner kopieren */
export function BackupActions({newest, configured}: Props) {
    const create = useCreateBackup();
    const copy = useCopyBackup();
    const busy = create.isCreating || copy.isCopying;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                <Button onClick={create.create} disabled={!configured || busy}>
                    <DatabaseBackup data-icon="inline-start" />
                    {create.isCreating ? "Backup läuft…" : "Backup jetzt erstellen"}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => newest && copy.copy(newest)}
                    disabled={!configured || !newest || busy}
                >
                    <HardDriveDownload data-icon="inline-start" />
                    {copy.isCopying ? "Kopiere…" : "Auf diesen Rechner kopieren"}
                </Button>
            </div>
            {create.error && <ErrorText>{create.error.message}</ErrorText>}
            {copy.error && <ErrorText>{copy.error.message}</ErrorText>}
        </div>
    );
}
