import type {Config} from "@netlify/functions";
import {withTiming} from "./lib/timing";
import {runBackup} from "./lib/backup-store";

// Das nächtliche Backup (features/use-case/database-backup.md). Netlify startet es nur im veröffentlichten Deploy.
// Einen fehlgeschlagenen Lauf speichert runBackup selbst. Läuft er gar nicht erst an, zeigt die Administration nach
// 26 Stunden ohne Erfolg eine Warnung.
const handler = async () => {
    try {
        const run = await runBackup("schedule", null);
        console.log(`[backup] ${run.status} ${run.fileName ?? ""} ${run.error ?? ""}`.trim());
    } catch (err) {
        console.error("[backup] nicht gestartet", err);
    }
    return new Response(null, {status: 204});
};

export default withTiming("backup-scheduled", handler);

// 02:00 UTC, also 03:00 oder 04:00 in Deutschland
export const config: Config = {schedule: "0 2 * * *"};
