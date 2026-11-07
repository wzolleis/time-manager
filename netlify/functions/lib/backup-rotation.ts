// netlify/functions/lib/backup-rotation.ts
// Namen der Backup-Dateien und welche davon beim Aufräumen gelöscht werden (features/use-case/database-backup.md)

// time_manager_2026-11-08T020000Z.sql.gz.age, Zeitpunkt in UTC. So sortiert der Name wie die Zeit.
const BACKUP_FILE = /^time_manager_(\d{4})-(\d{2})-(\d{2})T(\d{6})Z\.sql\.gz\.age$/;

const KEEP_DAILY = 7;
const KEEP_WEEKLY = 4;
const KEEP_MONTHLY = 12;

const pad = (n: number, length = 2) => String(n).padStart(length, "0");

/** Der Dateiname für ein Backup zum Zeitpunkt at */
export function backupFileName(at: Date): string {
    const day = `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
    const time = `${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`;
    return `time_manager_${day}T${time}Z.sql.gz.age`;
}

export const isBackupFileName = (name: string) => BACKUP_FILE.test(name);

// Der Montag der Woche als "JJJJ-MM-TT", in UTC wie der Dateiname
function weekKey(year: number, month: number, day: number): string {
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return date.toISOString().slice(0, 10);
}

/**
 * Die Backups, die beim Aufräumen gelöscht werden. Es bleiben je das neueste Backup der letzten 7 Tage, 4 Wochen und
 * 12 Monate, an denen es Backups gibt. Andere Dateien, auch unfertige Uploads (.tmp), werden nie gelöscht.
 */
export function backupsToDelete(names: string[]): string[] {
    const backups = names
        .map((name) => ({name, match: BACKUP_FILE.exec(name)}))
        .filter((b): b is {name: string; match: RegExpExecArray} => b.match !== null)
        .sort((a, b) => b.name.localeCompare(a.name)); // das neueste zuerst

    const keep = new Set<string>();
    const keepNewestPer = (count: number, key: (m: RegExpExecArray) => string) => {
        const seen = new Set<string>();
        for (const {name, match} of backups) {
            const k = key(match);
            if (seen.has(k)) continue;
            if (seen.size === count) break;
            seen.add(k);
            keep.add(name);
        }
    };
    keepNewestPer(KEEP_DAILY, ([, y, m, d]) => `${y}-${m}-${d}`);
    keepNewestPer(KEEP_WEEKLY, ([, y, m, d]) => weekKey(Number(y), Number(m), Number(d)));
    keepNewestPer(KEEP_MONTHLY, ([, y, m]) => `${y}-${m}`);

    return backups.filter((b) => !keep.has(b.name)).map((b) => b.name);
}
