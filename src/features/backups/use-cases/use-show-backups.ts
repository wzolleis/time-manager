import {useMemo} from "react";
import {useNow} from "@/lib/use-now";
import {useBackups} from "@/views/backups";
import {backupWarnings, newestCopyable} from "@shared/backup-rules";

/** Der Administrator sieht die letzten Backups und ob etwas nicht stimmt */
export function useShowBackups() {
    const now = useNow();
    const backups = useBackups();
    const data = backups.data;

    const warnings = useMemo(
        () => (data ? backupWarnings(data.runs, data.lastCopiedAt, new Date(now)) : []),
        [data, now],
    );

    return {
        runs: data?.runs,
        configured: data?.configured ?? true,
        lastCopiedAt: data?.lastCopiedAt ?? null,
        newest: data ? newestCopyable(data.runs) : null,
        warnings,
        isPending: backups.isPending,
        error: backups.error,
        retry: () => backups.refetch(),
    };
}
