// shared/week.test.ts
import {describe, expect, it} from "vitest";
import {
    addMonths,
    isoWeek,
    isoWeekId,
    isValidMonth,
    isValidYear,
    isWeekend,
    monthWeeks,
    parseIsoWeek,
    startOfWeek,
    weekDays,
    yearMonths,
} from "./week";

describe("startOfWeek", () => {
    it("liefert den Montag", () => {
        expect(startOfWeek("2026-06-10")).toBe("2026-06-08"); // Mittwoch
        expect(startOfWeek("2026-06-08")).toBe("2026-06-08"); // Montag selbst
    });

    it("gehört der Sonntag zur Woche davor", () => {
        expect(startOfWeek("2026-06-07")).toBe("2026-06-01");
    });
});

describe("weekDays", () => {
    it("liefert sieben Tage von Montag bis Sonntag", () => {
        const days = weekDays("2026-06-10");
        expect(days).toHaveLength(7);
        expect(days[0]).toBe("2026-06-08");
        expect(days[6]).toBe("2026-06-14");
    });

    it("rechnet über Monats- und Jahresgrenzen", () => {
        expect(weekDays("2026-12-31")).toEqual([
            "2026-12-28",
            "2026-12-29",
            "2026-12-30",
            "2026-12-31",
            "2027-01-01",
            "2027-01-02",
            "2027-01-03",
        ]);
    });
});

describe("isoWeek", () => {
    it("bestimmt die Kalenderwoche", () => {
        expect(isoWeek("2026-06-10")).toEqual({year: 2026, week: 24});
    });

    it("Anfang Januar kann noch zur letzten Woche des Vorjahres gehören", () => {
        expect(isoWeek("2027-01-01")).toEqual({year: 2026, week: 53}); // 2026 hat 53 Wochen
    });

    it("Ende Dezember kann schon zur ersten Woche des Folgejahres gehören", () => {
        expect(isoWeek("2025-12-29")).toEqual({year: 2026, week: 1});
    });
});

describe("isWeekend", () => {
    it("erkennt Samstag und Sonntag", () => {
        expect(isWeekend("2026-10-03")).toBe(true); // Samstag
        expect(isWeekend("2026-10-04")).toBe(true); // Sonntag
        expect(isWeekend("2026-10-02")).toBe(false); // Freitag
    });
});

describe("isValidYear", () => {
    it("akzeptiert vierstellige Jahre ab 1970", () => {
        expect(isValidYear("2026")).toBe(true);
        expect(isValidYear("1970")).toBe(true);
    });

    it("lehnt alles andere ab", () => {
        for (const year of ["26", "2026x", "0000", "1969", "20260", ""]) expect(isValidYear(year)).toBe(false);
    });
});

describe("yearMonths", () => {
    it("liefert Januar bis Dezember", () => {
        const months = yearMonths("2026");
        expect(months).toHaveLength(12);
        expect(months[0]).toBe("2026-01");
        expect(months[11]).toBe("2026-12");
    });
});

describe("addMonths", () => {
    it("rechnet über den Jahreswechsel", () => {
        expect(addMonths("2026-12", 1)).toBe("2027-01");
        expect(addMonths("2027-01", -1)).toBe("2026-12");
    });
});

describe("monthWeeks", () => {
    it("beschneidet die Wochen am Monatsanfang und -ende auf den Monat", () => {
        const weeks = monthWeeks("2026-10"); // 01.10. ist ein Donnerstag, 31.10. ein Samstag
        expect(weeks.map((w) => w.week)).toEqual([40, 41, 42, 43, 44]);
        expect(weeks[0].days).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
        expect(weeks[1].days).toHaveLength(7);
        expect(weeks[4].days.at(-1)).toBe("2026-10-31");
    });

    it("nennt beim Jahreswechsel die ISO-Kalenderwoche mit ihrem Jahr", () => {
        const january = monthWeeks("2027-01");
        expect(january[0]).toEqual({year: 2026, week: 53, days: ["2027-01-01", "2027-01-02", "2027-01-03"]});
        expect(january[1]).toMatchObject({year: 2027, week: 1});
        expect(monthWeeks("2026-12").at(-1)?.days).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31"]);
    });
});

describe("isoWeekId und parseIsoWeek", () => {
    it("liefert die Woche eines Tages und deren Montag", () => {
        expect(isoWeekId("2026-10-21")).toBe("2026-W43");
        expect(parseIsoWeek("2026-W43")).toBe("2026-10-19");
    });

    it("rechnet über den Jahreswechsel mit dem ISO-Wochenjahr", () => {
        expect(isoWeekId("2026-12-31")).toBe("2026-W53");
        expect(isoWeekId("2027-01-01")).toBe("2026-W53");
        expect(isoWeekId("2027-01-04")).toBe("2027-W01");
        expect(parseIsoWeek("2026-W53")).toBe("2026-12-28");
        expect(parseIsoWeek("2027-W01")).toBe("2027-01-04");
        expect(parseIsoWeek("2026-W01")).toBe("2025-12-29");
    });

    it("hin und zurück ergibt dieselbe Woche", () => {
        for (const day of ["2026-01-01", "2026-06-10", "2026-12-28", "2027-01-03", "2020-12-31"]) {
            expect(isoWeekId(parseIsoWeek(isoWeekId(day))!)).toBe(isoWeekId(day));
        }
    });

    it("lehnt ungültige Angaben ab", () => {
        expect(parseIsoWeek("2026-W00")).toBeNull();
        expect(parseIsoWeek("2026-W54")).toBeNull();
        expect(parseIsoWeek("2027-W53")).toBeNull(); // 2027 hat nur 52 Wochen
        expect(parseIsoWeek("2026-43")).toBeNull();
        expect(parseIsoWeek("2026-W4")).toBeNull();
    });
});

describe("isValidMonth", () => {
    it("akzeptiert die Monate 01 bis 12", () => {
        expect(isValidMonth("2026-01")).toBe(true);
        expect(isValidMonth("2026-12")).toBe(true);
    });

    it("lehnt andere Angaben ab", () => {
        expect(isValidMonth("2026-00")).toBe(false);
        expect(isValidMonth("2026-13")).toBe(false);
        expect(isValidMonth("2026-1")).toBe(false);
        expect(isValidMonth("2026-10-01")).toBe(false);
    });
});
