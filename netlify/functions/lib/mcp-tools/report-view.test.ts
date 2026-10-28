import {describe, expect, it} from "vitest";
import type {StoredEntry} from "../time-entries-store";
import {
    dailyReport,
    DailyReportSchema,
    monthlyReport,
    type ReportData,
    weeklyReport,
    WeeklyReportSchema,
    yearlyReport,
    YearlyReportSchema,
} from "./report-view";
import {yearTotals} from "../../../../shared/time-report";
import {defaultHistory} from "../../../../shared/user-setting-rules";

const entry = (id: string, type: StoredEntry["type"], iso: string, projectId: string | null = null): StoredEntry => ({
    id,
    userId: "u1",
    type,
    bookedAt: new Date(iso),
    projectId,
});

// Das Beispiel aus mcp-enable.md: Mittwoch, 21.10.2026, 12:10 Uhr
const NOW = new Date("2026-10-21T10:10:00Z");

const data = (extra: Partial<ReportData> = {}): ReportData => ({
    entries: [
        entry("m1", "kommen", "2026-10-19T06:00:00Z", "p1"), // Mo 08:00
        entry("m2", "gehen", "2026-10-19T10:00:00Z"), // 12:00
        entry("m3", "kommen", "2026-10-19T10:45:00Z", "p1"), // 12:45
        entry("m4", "gehen", "2026-10-19T15:00:00Z"), // 17:00 → 8 Std 15 Min, Pause 45 Min
        entry("t1", "kommen", "2026-10-20T06:00:00Z"), // Di 08:00
        entry("t2", "gehen", "2026-10-20T10:00:00Z"), // 12:00
        entry("t3", "kommen", "2026-10-20T10:30:00Z"), // 12:30
        entry("t4", "gehen", "2026-10-20T14:00:00Z"), // 16:00 → 7 Std 30 Min
        entry("w1", "kommen", "2026-10-21T06:00:00Z"), // Mi 08:00, läuft → 4 Std 10 Min
    ],
    projects: [{id: "p1", name: "Alpha"}],
    vacations: [],
    holidays: [],
    sickLeaves: [],
    soll: defaultHistory(8),
    ...extra,
});

describe("weeklyReport", () => {
    it("zeigt die Woche als Tabelle mit Summenzeile wie im Beispiel", () => {
        const {text} = weeklyReport(data(), "2026-10-21", NOW);
        expect(text).toContain("## KW 43, 19.10.–25.10.2026");
        expect(text).toContain("| Mo., 19.10. | 8 Std 15 Min | 45 Min | 8 Std | +15 Min |");
        expect(text).toContain("| Mi., 21.10. | 4 Std 10 Min, läuft | – | 8 Std | −3 Std 50 Min |");
        expect(text).toContain("| Sa., 24.10. | – | – | – | – |");
        expect(text).toContain("Bis heute 19 Std 55 Min von 24 Std Soll, −4 Std 5 Min. Soll der Woche 40 Std.");
    });

    it("liefert Minuten und Texte passend zum outputSchema", () => {
        const {structured} = weeklyReport(data(), "2026-10-21", NOW);
        expect(WeeklyReportSchema.parse(structured)).toBeTruthy();
        expect(structured).toMatchObject({
            year: 2026,
            week: 43,
            workMinutes: 1195,
            targetToDateMinutes: 1440,
            targetWeekMinutes: 2400,
            diffMinutes: -245,
            diff: "−4 Std 5 Min",
        });
        expect(structured.days[0]).toMatchObject({day: "2026-10-19", workMinutes: 495, diffMinutes: 15});
    });

    it("hat in einer künftigen Woche keine Differenz", () => {
        const {structured, text} = weeklyReport(data(), "2026-11-02", NOW);
        expect(structured.diffMinutes).toBeNull();
        expect(text).toContain("Soll der Woche 40 Std.");
        expect(text).not.toContain("Bis heute");
    });
});

describe("dailyReport", () => {
    it("zeigt die Buchungen mit Projekt und ID und darunter die Summen", () => {
        const {structured, text} = dailyReport(data(), "2026-10-19", NOW);
        expect(DailyReportSchema.parse(structured)).toBeTruthy();
        expect(text).toContain("## Montag, 19.10.2026");
        expect(text).toContain("| 08:00 Uhr | Kommen | Alpha | m1 |");
        expect(text).toContain("Arbeit 8 Std 15 Min · Pause 45 Min · Soll 8 Std · Differenz +15 Min");
        expect(structured.entries[0].bookedAt).toBe("2026-10-19T08:00:00+02:00");
    });

    it("markiert Buchungen an Krankheitstagen, sie zählen nicht", () => {
        const sick = data({sickLeaves: [{startDate: "2026-10-19", endDate: "2026-10-19"}]});
        const {structured, text} = dailyReport(sick, "2026-10-19", NOW);
        expect(structured.kindText).toBe("krank");
        expect(structured.workMinutes).toBe(0);
        expect(structured.entries.every((e) => e.ignored)).toBe(true);
        expect(text).toContain("## Montag, 19.10.2026 · krank");
        expect(text).toContain("Kommen · zählt nicht (krank)");
    });
});

describe("monthlyReport", () => {
    it("zeigt eine Zeile pro Kalenderwoche, nur mit den Tagen im Monat", () => {
        const {structured, text} = monthlyReport(data(), "2026-10", NOW);
        expect(text).toContain("## Oktober 2026");
        expect(text).toContain("| KW 40 (01.10.–04.10.) | – | – | – |");
        expect(text).toContain("| KW 43 (19.10.–25.10.) | 19 Std 55 Min, läuft | 40 Std | −4 Std 5 Min |");
        expect(structured.weeks.at(-1)).toMatchObject({week: 44, from: "2026-10-26", to: "2026-10-31"});
    });
});

describe("yearlyReport", () => {
    it("zeigt eine Zeile pro Monat mit Summen wie yearTotals", () => {
        const d = data();
        const {structured, text} = yearlyReport(d, "2026", NOW);
        const t = yearTotals(
            d.entries.map((e) => ({id: e.id, type: e.type, bookedAt: e.bookedAt})),
            "2026",
            d.vacations,
            d.holidays,
            d.sickLeaves,
            d.soll,
            "2026-10-21",
            NOW,
        );
        expect(YearlyReportSchema.parse(structured)).toBeTruthy();
        expect(structured.months).toHaveLength(12);
        expect(structured.months[0]).toMatchObject({month: "2026-01", monthText: "Januar", diffMinutes: null});
        expect(structured).toMatchObject({
            year: "2026",
            workMinutes: t.workMs / 60000,
            targetToDateMinutes: t.targetToDateMs / 60000,
            targetYearMinutes: t.targetYearMs / 60000,
            diffMinutes: t.diffMs / 60000,
            running: true,
        });
        expect(text).toContain("## 2026");
        expect(text).toContain("| Januar | – | – | – |");
        expect(text).toContain("| Oktober | 19 Std 55 Min, läuft |");
        expect(text).toContain("Soll des Jahres");
    });

    it("hat in einem künftigen Jahr keine Differenz", () => {
        const {structured, text} = yearlyReport(data(), "2027", NOW);
        expect(structured.diffMinutes).toBeNull();
        expect(structured.months.every((m) => m.diffMinutes === null)).toBe(true);
        expect(text).not.toContain("Bis heute");
    });

    it("nennt vor der ersten Buchung den Beginn der Zeiterfassung", () => {
        const {structured, text} = yearlyReport(data(), "2025", NOW);
        expect(structured.targetYearMinutes).toBe(0);
        expect(structured.months.every((m) => m.diffMinutes === null)).toBe(true);
        expect(text).toContain("Die Zeiterfassung beginnt 2026.");
        expect(yearlyReport(data(), "2026", NOW).text).not.toContain("Die Zeiterfassung beginnt");
    });
});
