import {describe, expect, it} from "vitest";
import {backupWarnings, newestCopyable} from "./backup-rules";

const NOW = new Date("2026-11-08T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();

type Run = Parameters<typeof backupWarnings>[0][number];
const run = (status: Run["status"], startedAt: string, extra: Partial<Run> = {}): Run => ({
    status,
    startedAt,
    fileName: status === "succeeded" ? `time_manager_${startedAt}.sql.gz.age` : null,
    error: status === "failed" ? "Server nicht erreichbar" : null,
    ...extra,
});

const recentCopy = hoursAgo(24);

describe("backupWarnings", () => {
    it("meldet nichts, wenn das letzte Backup gelang und die Kopie frisch ist", () => {
        expect(backupWarnings([run("succeeded", hoursAgo(10))], recentCopy, NOW)).toEqual([]);
    });

    it("meldet ein fehlgeschlagenes letztes Backup mit dem Fehler", () => {
        const runs = [run("failed", hoursAgo(1)), run("succeeded", hoursAgo(10))];
        expect(backupWarnings(runs, recentCopy, NOW)).toEqual([
            "Das letzte Backup ist fehlgeschlagen: Server nicht erreichbar",
        ]);
    });

    it("übergeht ein laufendes Backup und bewertet den Lauf davor", () => {
        const runs = [run("running", hoursAgo(0)), run("failed", hoursAgo(10)), run("succeeded", hoursAgo(20))];
        expect(backupWarnings(runs, recentCopy, NOW)).toEqual([
            "Das letzte Backup ist fehlgeschlagen: Server nicht erreichbar",
        ]);
    });

    it("warnt erst, wenn der letzte Erfolg mehr als 26 Stunden zurückliegt", () => {
        expect(backupWarnings([run("succeeded", hoursAgo(26))], recentCopy, NOW)).toEqual([]);
        expect(backupWarnings([run("succeeded", hoursAgo(26.1))], recentCopy, NOW)).toEqual([
            "Seit mehr als 26 Stunden gab es kein erfolgreiches Backup.",
        ]);
    });

    it("meldet, wenn es noch nie ein Backup und nie eine Kopie gab", () => {
        expect(backupWarnings([], null, NOW)).toEqual([
            "Es gibt noch kein erfolgreiches Backup.",
            "Es wurde noch kein Backup auf einen Rechner kopiert.",
        ]);
    });

    it("warnt erst, wenn die letzte Kopie mehr als 7 Tage her ist", () => {
        const runs = [run("succeeded", hoursAgo(1))];
        expect(backupWarnings(runs, hoursAgo(7 * 24), NOW)).toEqual([]);
        expect(backupWarnings(runs, hoursAgo(7 * 24 + 1), NOW)).toEqual([
            "Die letzte Kopie auf einen Rechner ist mehr als 7 Tage her.",
        ]);
    });
});

describe("newestCopyable", () => {
    it("nimmt das neueste erfolgreiche Backup mit Datei", () => {
        const ok = run("succeeded", hoursAgo(10));
        expect(newestCopyable([run("running", hoursAgo(0)), run("failed", hoursAgo(1)), ok])).toBe(ok);
    });

    it("liefert null ohne erfolgreiches Backup", () => {
        expect(newestCopyable([run("failed", hoursAgo(1))])).toBeNull();
    });
});
