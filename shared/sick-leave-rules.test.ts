// shared/sick-leave-rules.test.ts
import {describe, expect, it} from "vitest";
import {
    bookingsInRangeMessage,
    checkSickLeave,
    countBookingsInRange,
    isSickDay,
    sickDayMessage,
    sickDaysInYear,
    withoutSickDays,
} from "./sick-leave-rules";
import type {Booking} from "./time-rules";
import {countWorkdays, dayCount} from "./vacation-rules";

const s = (id: string, startDate: string, endDate: string) => ({id, startDate, endDate});
const b = (id: string, type: Booking["type"], iso: string): Booking => ({id, type, bookedAt: new Date(iso)});

describe("checkSickLeave", () => {
    const existing = [s("a", "2026-10-12", "2026-10-14")];

    it("akzeptiert einen freien Zeitraum und einen einzelnen Tag", () => {
        expect(checkSickLeave(existing, s("neu", "2026-10-15", "2026-10-16"))).toBeNull();
        expect(checkSickLeave(existing, s("neu", "2026-10-20", "2026-10-20"))).toBeNull();
    });

    it("lehnt einen ungültigen Zeitraum ab", () => {
        expect(checkSickLeave([], s("neu", "2026-10-16", "2026-10-15"))).toBe("Das Ende liegt vor dem Beginn");
        expect(checkSickLeave([], s("neu", "2026-02-30", "2026-03-02"))).toBe("Ungültiges Datum");
        expect(checkSickLeave([], s("neu", "2026-01-01", "2027-01-02"))).toBe(
            "Eine Krankmeldung darf höchstens 366 Tage lang sein",
        );
    });

    it("lehnt eine Überschneidung mit einer anderen Krankmeldung ab", () => {
        expect(checkSickLeave(existing, s("neu", "2026-10-14", "2026-10-16"))).toBe(
            "Überschneidet sich mit der Krankmeldung vom 12.10.2026 bis 14.10.2026",
        );
    });

    it("vergleicht eine geänderte Krankmeldung nicht mit sich selbst", () => {
        expect(checkSickLeave(existing, s("a", "2026-10-13", "2026-10-16"))).toBeNull();
    });
});

describe("Krankheitstage", () => {
    const none: {date: string}[] = []; // ohne Feiertage, auch ohne Neujahr

    it.each([
        ["2026-10-14", "2026-10-14", 1, 1], // Mi
        ["2026-10-14", "2026-10-20", 7, 5], // Sa 17. und So 18. zählen nicht
        ["2026-10-17", "2026-10-18", 2, 0], // nur Wochenende
        ["2026-12-28", "2027-01-08", 12, 10],
    ])("%s bis %s: %i Kalendertage, %i Krankheitstage", (start, end, days, sickDays) => {
        expect(dayCount(start, end)).toBe(days);
        expect(countWorkdays(start, end, none)).toBe(sickDays);
    });

    it("zählen im Jahr nur mit dem Teil, der im Jahr liegt", () => {
        const sickLeaves = [s("a", "2026-12-28", "2027-01-08")];
        expect(sickDaysInYear(sickLeaves, 2026, none)).toBe(4);
        expect(sickDaysInYear(sickLeaves, 2027, none)).toBe(6);
        expect(sickDaysInYear(sickLeaves, 2025, none)).toBe(0);
    });

    it("Feiertage zählen nicht als Krankheitstage", () => {
        expect(sickDaysInYear([s("a", "2026-09-28", "2026-10-02")], 2026, [{date: "2026-10-02"}])).toBe(4);
    });

    it("Beginn und Ende sind Krankheitstage", () => {
        const sickLeaves = [s("a", "2026-10-14", "2026-10-16")];
        expect(isSickDay("2026-10-13", sickLeaves)).toBe(false);
        expect(isSickDay("2026-10-14", sickLeaves)).toBe(true);
        expect(isSickDay("2026-10-16", sickLeaves)).toBe(true);
        expect(isSickDay("2026-10-17", sickLeaves)).toBe(false);
    });
});

describe("withoutSickDays", () => {
    // Mi 14.10.2026 08:00 bis 12:00 und Do 15.10.2026 08:00 bis 12:00 (Berlin, Sommerzeit)
    const entries = [
        b("1", "kommen", "2026-10-14T06:00:00Z"),
        b("2", "gehen", "2026-10-14T10:00:00Z"),
        b("3", "kommen", "2026-10-15T06:00:00Z"),
        b("4", "gehen", "2026-10-15T10:00:00Z"),
    ];

    it("lässt die Buchungen an Krankheitstagen weg", () => {
        const ids = withoutSickDays(entries, [s("a", "2026-10-14", "2026-10-14")]).map((e) => e.id);
        expect(ids).toEqual(["3", "4"]);
    });

    it("ohne Krankmeldung bleiben alle Buchungen", () => {
        expect(withoutSickDays(entries, [])).toEqual(entries);
    });

    it("maßgeblich ist der Tag in Berlin, nicht in UTC", () => {
        const lateEvening = [b("5", "kommen", "2026-10-14T22:30:00Z")]; // 15.10. 00:30 in Berlin
        expect(withoutSickDays(lateEvening, [s("a", "2026-10-14", "2026-10-14")])).toHaveLength(1);
        expect(withoutSickDays(lateEvening, [s("a", "2026-10-15", "2026-10-15")])).toHaveLength(0);
    });
});

describe("Hinweise", () => {
    it("zählt die Buchungen im Zeitraum", () => {
        const entries = [b("1", "kommen", "2026-10-14T06:00:00Z"), b("2", "gehen", "2026-10-14T10:00:00Z")];
        expect(countBookingsInRange(entries, {startDate: "2026-10-14", endDate: "2026-10-14"})).toBe(2);
        expect(countBookingsInRange(entries, {startDate: "2026-10-15", endDate: "2026-10-20"})).toBe(0);
    });

    it("nennt die Zahl der Buchungen und den Tag", () => {
        expect(bookingsInRangeMessage(2)).toBe("Im Zeitraum gibt es 2 Buchungen. Sie zählen nicht zur Arbeitszeit.");
        expect(sickDayMessage("2026-10-14")).toBe(
            "Der 14.10.2026 ist als Krankheitstag eingetragen. Die Buchung zählt nicht zur Arbeitszeit.",
        );
    });
});
