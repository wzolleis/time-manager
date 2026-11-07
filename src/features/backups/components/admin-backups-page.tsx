import {BackupActions} from "@features/backups/components/backup-actions";
import {BackupRunList} from "@features/backups/components/backup-run-list";
import {BackupStatus} from "@features/backups/components/backup-status";
import {useShowBackups} from "@features/backups/use-cases/use-show-backups";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

export function AdminBackupsPage() {
    const backups = useShowBackups();

    return (
        <Page>
            <PageHeader
                title="Backups"
                description="Jede Nacht um 02:00 UTC entsteht ein verschlüsseltes Backup der Datenbank. Eingespielt wird es mit dem privaten Schlüssel per Skript."
                actions={<BackupActions newest={backups.newest} configured={backups.configured} />}
            />
            <BackupStatus
                warnings={backups.warnings}
                configured={backups.configured}
                lastCopiedAt={backups.lastCopiedAt}
            />
            <BackupRunList backups={backups} />
        </Page>
    );
}
