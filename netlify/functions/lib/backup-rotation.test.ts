import {describe, expect, it} from "vitest";
import {backupFileName, backupsToDelete, isBackupFileName} from "./backup-rotation";

const file = (iso: string) => backupFileName(new Date(iso));

// Ein Backup jede Nacht um 02:00 UTC, vom ersten bis zum letzten Tag
function nightly(from: string, days: number): string[] {
    const start = new Date(`${from}T02:00:00Z`).getTime();
    return Array.from({length: days}, (_, i) => backupFileName(new Date(start + i * 24 * 60 * 60 * 1000)));
}

describe("backupFileName", () => {
    it("nennt den Zeitpunkt in UTC mit Sekunden", () => {
        expect(file("2026-11-08T02:00:05Z")).toBe("time_manager_2026-11-08T020005Z.sql.gz.age");
        expect(isBackupFileName(file("2026-11-08T02:00:05Z"))).toBe(true);
    });
});

describe("backupsToDelete", () => {
    it("behält bei wenigen Backups alle", () => {
        expect(backupsToDelete(nightly("2026-11-01", 7))).toEqual([]);
    });

    it("behält 7 Tage, dazu das neueste je Woche und je Monat", () => {
        const names = nightly("2026-01-01", 365); // bis 2026-12-31
        const kept = names.filter((n) => !backupsToDelete(names).includes(n));

        expect(kept).toEqual(
            [
                // 12 Monate: das letzte Backup jedes Monats von Januar bis November, Dezember steckt in den Tagen
                ...["01-31", "02-28", "03-31", "04-30", "05-31", "06-30", "07-31", "08-31", "09-30", "10-31", "11-30"],
                // 4 Wochen (Sonntag ist der letzte Tag einer Woche), die vierte ist die mit dem 31.12.
                "12-13",
                "12-20",
                "12-27",
                // 7 Tage
                ...["12-25", "12-26", "12-28", "12-29", "12-30", "12-31"],
            ]
                .map((d) => `time_manager_2026-${d}T020000Z.sql.gz.age`)
                .sort(),
        );
    });

    it("behält von mehreren Backups eines Tages nur das neueste", () => {
        const names = [...nightly("2026-11-01", 7), file("2026-11-07T18:30:00Z")];
        expect(backupsToDelete(names)).toEqual([file("2026-11-07T02:00:00Z")]);
    });

    it("rechnet mit den Tagen, an denen es Backups gibt, nicht mit dem Kalender", () => {
        // Lücke von drei Monaten: die alten Backups bleiben, weil es keine neueren Tage gibt
        const names = [...nightly("2026-06-01", 3), ...nightly("2026-09-10", 3)];
        expect(backupsToDelete(names)).toEqual([]);
    });

    it("löscht nie fremde Dateien oder unfertige Uploads", () => {
        const names = [
            ...nightly("2026-01-01", 365),
            "time_manager_2026-01-01T020000Z.sql.gz.age.tmp",
            "notizen.txt",
            "time_manager_2026-01-01.sql.gz.age",
        ];
        const deleted = backupsToDelete(names);
        expect(deleted).not.toContain("time_manager_2026-01-01T020000Z.sql.gz.age.tmp");
        expect(deleted).not.toContain("notizen.txt");
        expect(deleted).not.toContain("time_manager_2026-01-01.sql.gz.age");
        expect(deleted.every(isBackupFileName)).toBe(true);
    });
});
