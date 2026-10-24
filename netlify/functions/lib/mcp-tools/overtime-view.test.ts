import {describe, expect, it} from "vitest";
import type {StoredEntry} from "../time-entries-store";
import {overtimeReport, OvertimeReportSchema} from "./overtime-view";
import type {ReportData} from "./report-view";

const entry = (id: string, type: StoredEntry["type"], iso: string): StoredEntry => ({
    id,
    userId: "u1",
    type,
    bookedAt: new Date(iso),
    projectId: null,
});

// Mo 12.10. bis Mi 14.10.2026 je 9 Stunden (08:00–17:00, Sommerzeit)
const data: ReportData = {
    entries: ["12", "13", "14"].flatMap((d) => [
        entry(`${d}k`, "kommen", `2026-10-${d}T06:00:00Z`),
        entry(`${d}g`, "gehen", `2026-10-${d}T15:00:00Z`),
    ]),
    projects: [],
    vacations: [],
    holidays: [],
    sickLeaves: [],
};

// Do 15.10.2026, 07:00, vor dem ersten Kommen
const NOW = new Date("2026-10-15T05:00:00Z");

describe("overtimeReport", () => {
    it("zeigt Saldo und Korrektur wie die Karte in der UI", () => {
        const r = overtimeReport(data, {offset: 210, created: new Date("2026-10-12T07:00:00Z")}, NOW);
        expect(OvertimeReportSchema.parse(r.structured)).toEqual(r.structured);
        expect(r.structured).toEqual({
            balanceMinutes: -90,
            balance: "−1:30 h",
            correction: {
                offsetMinutes: 210,
                offset: "+3:30 h",
                day: "2026-10-12",
                created: "2026-10-12T09:00:00+02:00",
            },
        });
        expect(r.text).toBe("Überstunden: −1:30 h\nKorrektur am 12.10.2026: +3:30 h");
    });

    it("rechnet ohne Korrektur ab Beginn der Zeiterfassung", () => {
        const r = overtimeReport(data, null, NOW);
        expect(r.structured.balanceMinutes).toBe(3 * 60 - 8 * 60);
        expect(r.structured.correction).toBeNull();
        expect(r.text).toBe("Überstunden: −5:00 h\nKeine Korrektur");
    });
});
