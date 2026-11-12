// shared/time-report.test.ts
import {describe, expect, it} from "vitest";
import {day, month, year} from "./test-dates";
import {localDayRange} from "./day-range";
import {dayDiffMs, dayTotals, monthTotals, weekTotals, yearTotals} from "./time-report";
import type {Booking} from "./time-rules";
import {addDays} from "./day-range";
import {weekDays} from "./week";
import type {Day} from "./date-schemas";
import {defaultHistory} from "./user-setting-rules";

const SOLL = defaultHistory(8); // ohne eigene Werte

const b = (id: string, type: Booking["type"], iso: string): Booking => ({
    id,
    type,
    bookedAt: new Date(iso),
});
const HOUR = 3_600_000;
const june10 = localDayRange(day("2026-06-10")); // 22:00Z bis 22:00Z

const workday = [
    b("1", "kommen", "2026-06-10T06:00:00Z"), // 08:00
    b("2", "gehen", "2026-06-10T10:00:00Z"), // 12:00
    b("3", "kommen", "2026-06-10T10:30:00Z"), // 12:30
    b("4", "gehen", "2026-06-10T15:00:00Z"), // 17:00
];

// Erste Buchung lange vor den Testtagen, damit das Soll an allen Testtagen zählt
const started = [b("s1", "kommen", "2026-01-05T07:00:00Z"), b("s2", "gehen", "2026-01-05T15:00:00Z")];

describe("dayTotals", () => {
    it("summiert Arbeitszeit und Pause eines vollständigen Tages", () => {
        const t = dayTotals(workday, june10, [], new Date("2026-06-10T20:00:00Z"));
        expect(t.workMs).toBe(8.5 * HOUR);
        expect(t.breakMs).toBe(0.5 * HOUR);
        expect(t.running).toBe(false);
    });

    it("zählt einen laufenden Zeitraum bis jetzt", () => {
        const t = dayTotals(workday.slice(0, 1), june10, [], new Date("2026-06-10T08:30:00Z"));
        expect(t.workMs).toBe(2.5 * HOUR);
        expect(t.running).toBe(true);
    });

    it("teilt Altdaten am Tageswechsel", () => {
        const night = [
            b("1", "kommen", "2026-06-09T20:00:00Z"), // 22:00 Berlin
            b("2", "gehen", "2026-06-10T04:00:00Z"), // 06:00 Berlin
        ];
        const now = new Date("2026-06-10T20:00:00Z");
        expect(dayTotals(night, june10, [], now).workMs).toBe(6 * HOUR); // 00:00 bis 06:00
        expect(dayTotals(night, localDayRange(day("2026-06-09")), [], now).workMs).toBe(2 * HOUR); // 22:00 bis 24:00
    });

    it("ignoriert Buchungen anderer Tage", () => {
        const yesterday = [b("1", "kommen", "2026-06-09T06:00:00Z"), b("2", "gehen", "2026-06-09T14:00:00Z")];
        const t = dayTotals(yesterday, june10, [], new Date("2026-06-10T09:00:00Z"));
        expect(t).toEqual({workMs: 0, breakMs: 0, running: false, missingGehen: false});
    });

    it("liefert Nullen ohne Buchungen", () => {
        expect(dayTotals([], june10, [], new Date("2026-06-10T09:00:00Z"))).toEqual({
            workMs: 0,
            breakMs: 0,
            running: false,
            missingGehen: false,
        });
    });

    it("lässt ein vergessenes gehen nicht in den nächsten Tag laufen", () => {
        const forgotten = [b("1", "kommen", "2026-06-09T06:00:00Z")]; // 9.6., 08:00, nie ausgestempelt
        const now = new Date("2026-06-10T09:00:00Z");

        const yesterday = dayTotals(forgotten, localDayRange(day("2026-06-09")), [], now);
        expect(yesterday).toEqual({workMs: 0, breakMs: 0, running: false, missingGehen: true});

        const today = dayTotals(forgotten, localDayRange(day("2026-06-10")), [], now);
        expect(today).toEqual({workMs: 0, breakMs: 0, running: false, missingGehen: false});
    });

    it("meldet kein fehlendes gehen am laufenden Tag", () => {
        const t = dayTotals(workday.slice(0, 1), june10, [], new Date("2026-06-10T08:30:00Z"));
        expect(t.missingGehen).toBe(false);
        expect(t.running).toBe(true);
    });
});

describe("dayDiffMs", () => {
    const today = day("2026-10-14");

    it("rechnet Arbeitszeit minus Soll für heute und vergangene Tage", () => {
        expect(dayDiffMs(day("2026-10-14"), today, 8.5 * HOUR, 8 * HOUR)).toBe(0.5 * HOUR);
        expect(dayDiffMs(day("2026-10-12"), today, 0, 8 * HOUR)).toBe(-8 * HOUR);
        expect(dayDiffMs(day("2026-10-17"), day("2026-10-18"), 2 * HOUR, 0)).toBe(2 * HOUR); // Wochenende mit Arbeit
    });

    it("keine Differenz für künftige Tage", () => {
        expect(dayDiffMs(day("2026-10-15"), today, 0, 8 * HOUR)).toBeNull();
    });

    it("keine Differenz an einem freien Tag ohne Arbeit", () => {
        expect(dayDiffMs(day("2026-10-13"), today, 0, 0)).toBeNull();
    });
});

describe("weekTotals", () => {
    const week = weekDays(day("2026-06-10")); // Mo 8.6. bis So 14.6.
    const now = new Date("2026-06-10T20:00:00Z"); // Mittwoch abends

    it("rechnet die Differenz mitten in der Woche gegen das Soll bis heute", () => {
        const t = weekTotals([...started, ...workday], week, [], [], [], SOLL, day("2026-06-10"), now);
        expect(t.targetWeekMs).toBe(40 * HOUR);
        expect(t.targetToDateMs).toBe(24 * HOUR); // Mo bis Mi
        expect(t.workMs).toBe(8.5 * HOUR);
        expect(t.diffMs).toBe(8.5 * HOUR - 24 * HOUR);
    });

    it("zeigt keine Differenz für künftige Tage und freie Tage ohne Arbeit", () => {
        const t = weekTotals([...started, ...workday], week, [], [], [], SOLL, day("2026-06-10"), now);
        const diffs = Object.fromEntries(t.days.map((d) => [d.day, d.diffMs]));
        expect(diffs["2026-06-09"]).toBe(-8 * HOUR); // vergangener Arbeitstag ohne Buchung
        expect(diffs["2026-06-10"]).toBe(0.5 * HOUR);
        expect(diffs["2026-06-11"]).toBeNull(); // Zukunft
        expect(weekTotals(started, week, [], [], [], SOLL, day("2026-06-14"), now).days[6].diffMs).toBeNull(); // Sonntag ohne Arbeit
    });

    it("senkt das Wochensoll an Urlaubs- und Feiertagen", () => {
        const vacations = [{startDate: day("2026-06-08"), endDate: day("2026-06-08")}];
        const holidays = [{date: day("2026-06-11"), name: "Fronleichnam"}];
        const t = weekTotals(started, week, vacations, holidays, [], SOLL, day("2026-06-10"), now);
        expect(t.targetWeekMs).toBe(24 * HOUR);
        expect(t.days[3]).toMatchObject({kind: "holiday", holidayName: "Fronleichnam", targetMs: 0});
    });
});

describe("Buchungen an Krankheitstagen", () => {
    const week = weekDays(day("2026-10-14")); // Mo 12.10. bis So 18.10.
    const now = new Date("2026-10-16T18:00:00Z"); // Freitag abends
    // Mi 14.10.2026 08:00 bis 12:00
    const sickDay = [b("1", "kommen", "2026-10-14T06:00:00Z"), b("2", "gehen", "2026-10-14T10:00:00Z")];
    const sick = [{startDate: day("2026-10-14"), endDate: day("2026-10-14")}];
    const range = localDayRange(day("2026-10-14"));

    it("zählen nicht zur Arbeitszeit", () => {
        expect(dayTotals([...started, ...sickDay], range, sick, now).workMs).toBe(0);
    });

    it("ohne Krankmeldung zählen dieselben Buchungen wieder", () => {
        expect(dayTotals([...started, ...sickDay], range, [], now).workMs).toBe(4 * HOUR);
    });

    it("eine laufende Arbeitszeit zählt nicht", () => {
        const running = [b("1", "kommen", "2026-10-14T06:00:00Z")];
        const t = dayTotals(running, range, sick, new Date("2026-10-14T08:00:00Z"));
        expect(t).toMatchObject({workMs: 0, running: false});
    });

    it("ein Krankheitstag hat Soll 0 und Differenz 0, die Buchungen bleiben gezählt", () => {
        const t = weekTotals([...started, ...sickDay], week, [], [], sick, SOLL, day("2026-10-16"), now);
        expect(t.days[2]).toMatchObject({kind: "sick", targetMs: 0, workMs: 0, count: 2, diffMs: null});
        expect(t.targetWeekMs).toBe(32 * HOUR);
        expect(t.workMs).toBe(0);
    });

    it("der Beginn der Zeiterfassung zählt auch Buchungen an Krankheitstagen", () => {
        const t = weekTotals(sickDay, week, [], [], sick, SOLL, day("2026-10-16"), now);
        expect(t.days[1].kind).toBe("untracked"); // Di vor der ersten Buchung
        expect(t.days[3]).toMatchObject({kind: "workday", targetMs: 8 * HOUR}); // Do danach
    });

    it("der Monat summiert ohne den Krankheitstag", () => {
        const t = monthTotals([...started, ...sickDay], month("2026-10"), [], [], sick, SOLL, day("2026-11-15"), now);
        expect(t.targetMonthMs).toBe(21 * 8 * HOUR); // 22 Arbeitstage im Oktober, einer davon krank
        expect(t.workMs).toBe(0);
    });
});

describe("monthTotals", () => {
    // Mo 28.09. und Do 01.10.2026, je 8 Stunden
    const edge = [
        b("1", "kommen", "2026-09-28T06:00:00Z"),
        b("2", "gehen", "2026-09-28T14:00:00Z"),
        b("3", "kommen", "2026-10-01T06:00:00Z"),
        b("4", "gehen", "2026-10-01T14:00:00Z"),
    ];
    const afterOctober = new Date("2026-11-15T12:00:00Z");

    it("zählt von Wochen am Monatsrand nur die Tage im Monat", () => {
        const t = monthTotals(edge, month("2026-10"), [], [], [], SOLL, day("2026-11-15"), afterOctober);
        expect(t.weeks[0]).toMatchObject({week: 40, workMs: 8 * HOUR, targetMs: 16 * HOUR}); // Do und Fr
        expect(t.weeks[4]).toMatchObject({week: 44, targetMs: 40 * HOUR}); // Mo bis Fr, ohne So 01.11.
        expect(t.targetMonthMs).toBe(22 * 8 * HOUR); // 22 Arbeitstage im Oktober 2026
        expect(t.workMs).toBe(8 * HOUR);
    });

    it("rechnet im laufenden Monat nur gegen das Soll bis heute", () => {
        const now = new Date("2026-10-14T18:00:00Z"); // Mittwoch
        const t = monthTotals(edge, month("2026-10"), [], [], [], SOLL, day("2026-10-14"), now);
        expect(t.targetToDateMs).toBe(10 * 8 * HOUR); // 01.10. bis 14.10.: 10 Arbeitstage
        expect(t.diffMs).toBe(8 * HOUR - 80 * HOUR);
        expect(t.weeks[2].diffMs).toBe(-24 * HOUR); // KW 42: Mo bis Mi ohne Arbeit
        expect(t.weeks[3].diffMs).toBeNull(); // KW 43 liegt ganz in der Zukunft
        expect(t.weeks[4].diffMs).toBeNull();
    });

    it("teilt die Woche am Jahreswechsel", () => {
        const now = new Date("2027-02-01T12:00:00Z");
        const december = monthTotals(started, month("2026-12"), [], [], [], SOLL, day("2027-02-01"), now);
        const january = monthTotals(started, month("2027-01"), [], [], [], SOLL, day("2027-02-01"), now);
        expect(december.weeks.at(-1)).toMatchObject({year: 2026, week: 53, targetMs: 4 * 8 * HOUR}); // Mo bis Do
        expect(january.weeks[0]).toMatchObject({year: 2026, week: 53, targetMs: 8 * HOUR}); // nur Fr 01.01.
    });
});

describe("Beginn der Zeiterfassung im Bericht", () => {
    // Erste Buchung am Mi 14.10.2026
    const fromMidOctober = [b("1", "kommen", "2026-10-14T06:00:00Z"), b("2", "gehen", "2026-10-14T14:00:00Z")];
    const afterOctober = new Date("2026-11-15T12:00:00Z");

    it("zählt das Soll erst ab dem Tag der ersten Buchung", () => {
        const t = monthTotals(fromMidOctober, month("2026-10"), [], [], [], SOLL, day("2026-11-15"), afterOctober);
        expect(t.targetMonthMs).toBe(13 * 8 * HOUR); // 14.10. bis 31.10.: 13 Arbeitstage
        expect(t.weeks[0]).toMatchObject({week: 40, targetMs: 0, diffMs: null}); // ganz vor dem Beginn
        expect(t.weeks[2]).toMatchObject({week: 42, targetMs: 3 * 8 * HOUR}); // Mi bis Fr
    });

    it("ohne Buchungen hat ein Monat kein Soll, auch in der Vergangenheit", () => {
        const t = monthTotals([], month("2026-10"), [], [], [], SOLL, day("2026-11-15"), afterOctober);
        expect(t.targetMonthMs).toBe(0);
        expect(t.weeks.every((w) => w.diffMs === null)).toBe(true);
    });
});

describe("yearTotals", () => {
    // Alle Tage eines Jahres, um gegen weekTotals über das ganze Jahr zu prüfen
    const daysOf = (y: string) => {
        const days: Day[] = [];
        for (let d = day(`${y}-01-01`); d.startsWith(y); d = addDays(d, 1)) days.push(d);
        return days;
    };
    const afterYear = new Date("2027-02-01T12:00:00Z");

    it("zählt jeden Tag des Jahres genau einmal, auch am Jahreswechsel", () => {
        const t = yearTotals([...started, ...workday], year("2026"), [], [], [], SOLL, day("2027-02-01"), afterYear);
        const all = weekTotals(
            [...started, ...workday],
            daysOf("2026"),
            [],
            [],
            [],
            SOLL,
            day("2027-02-01"),
            afterYear,
        );
        expect(t.months).toHaveLength(12);
        expect(t.targetYearMs).toBe(all.targetWeekMs);
        expect(t.workMs).toBe(all.workMs);
        expect(t.months[11].targetMs).toBe(
            monthTotals(started, month("2026-12"), [], [], [], SOLL, day("2027-02-01"), afterYear).targetMonthMs,
        );
    });

    it("rechnet im laufenden Jahr nur gegen das Soll bis heute", () => {
        const now = new Date("2026-10-14T18:00:00Z"); // Mittwoch
        const t = yearTotals(started, year("2026"), [], [], [], SOLL, day("2026-10-14"), now);
        const toDate = weekTotals(started, daysOf("2026"), [], [], [], SOLL, day("2026-10-14"), now).targetToDateMs;
        expect(t.targetToDateMs).toBe(toDate);
        expect(t.diffMs).toBe(t.workMs - toDate);
        expect(t.months[9].diffMs).not.toBeNull(); // Oktober läuft
        expect(t.months[10].diffMs).toBeNull(); // November liegt in der Zukunft
        expect(t.months[11].diffMs).toBeNull();
    });

    it("hat vor dem Beginn der Zeiterfassung kein Soll", () => {
        const fromMidOctober = [b("1", "kommen", "2026-10-14T06:00:00Z"), b("2", "gehen", "2026-10-14T14:00:00Z")];
        const t = yearTotals(fromMidOctober, year("2026"), [], [], [], SOLL, day("2027-02-01"), afterYear);
        expect(t.months.slice(0, 9).every((m) => m.targetMs === 0 && m.diffMs === null)).toBe(true);
        expect(t.months[9].targetMs).toBe(13 * 8 * HOUR); // 14.10. bis 31.10.
    });
});

describe("ganze Minuten je Tag", () => {
    // 02.11.2026: 07:58:13–12:12:25 und 13:06:02–16:49:08, zusammen 7:57:18
    const nov2 = day("2026-11-02");
    const seconds = [
        b("1", "kommen", "2026-11-02T06:58:13Z"),
        b("2", "gehen", "2026-11-02T11:12:25Z"),
        b("3", "kommen", "2026-11-02T12:06:02Z"),
        b("4", "gehen", "2026-11-02T15:49:08Z"),
    ];
    const now = new Date("2026-11-02T20:00:00Z");
    const MIN = 60_000;

    it("rundet die Arbeitszeit des Tages auf ganze Minuten ab", () => {
        expect(dayTotals(seconds, localDayRange(nov2), [], now).workMs).toBe(477 * MIN); // 7:57 = 7,95 h
    });

    it("die Differenz passt zur angezeigten Arbeitszeit: 8:00 − 7:57 = −0:03 (−0,05 h)", () => {
        const days = weekDays(nov2);
        const t = weekTotals([...started, ...seconds], days, [], [], [], SOLL, nov2, now);
        const row = t.days.find((d) => d.day === nov2)!;
        expect(row.diffMs).toBe(-3 * MIN);
        expect(t.workMs).toBe(477 * MIN);
        expect(t.diffMs).toBe(-3 * MIN);
    });
});
