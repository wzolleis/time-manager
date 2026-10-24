// shared/overtime-rules.test.ts
import {describe, expect, it} from "vitest";
import {balanceMinutes, checkOffset, formatOffset, fromOffset, overtimeBalanceMs, toOffset} from "./overtime-rules";
import type {Booking} from "./time-rules";

const MIN = 60_000;

// Ein Tag mit Arbeit von 08:00 bis zur angegebenen Stunde, Berliner Sommerzeit (UTC+2)
const worked = (day: string, untilHour: number): Booking[] => [
    {id: `${day}-k`, type: "kommen", bookedAt: new Date(`${day}T06:00:00Z`)},
    {id: `${day}-g`, type: "gehen", bookedAt: new Date(`${day}T${String(untilHour - 2).padStart(2, "0")}:00:00Z`)},
];

// Mo 05.10. bis Fr 09.10.2026: 42 Stunden bei 40 Stunden Soll
const firstWeek = [
    ...worked("2026-10-05", 18),
    ...worked("2026-10-06", 16),
    ...worked("2026-10-07", 16),
    ...worked("2026-10-08", 16),
    ...worked("2026-10-09", 16),
];

const balance = (correction: Parameters<typeof overtimeBalanceMs>[0], entries: Booking[], now: string) =>
    overtimeBalanceMs(correction, entries, [], [], [], now.slice(0, 10), new Date(now));

describe("toOffset und fromOffset", () => {
    it("rechnet die Auswahl im Dialog in Minuten um", () => {
        expect(toOffset({sign: "+", hours: 3, minutes: 30})).toBe(210);
        expect(toOffset({sign: "-", hours: 0, minutes: 10})).toBe(-10);
        expect(toOffset({sign: "+", hours: 0, minutes: 0})).toBe(0);
        expect(Object.is(toOffset({sign: "-", hours: 0, minutes: 0}), 0)).toBe(true);
    });

    it("belegt den Dialog aus dem gespeicherten Wert vor, ohne Korrektur mit +0:00", () => {
        expect(fromOffset(210)).toEqual({sign: "+", hours: 3, minutes: 30});
        expect(fromOffset(-10)).toEqual({sign: "-", hours: 0, minutes: 10});
        expect(fromOffset(-1439)).toEqual({sign: "-", hours: 23, minutes: 59});
        expect(fromOffset(null)).toEqual({sign: "+", hours: 0, minutes: 0});
    });
});

describe("checkOffset", () => {
    it("akzeptiert Werte bis ±23:59", () => {
        expect(checkOffset(0)).toBeNull();
        expect(checkOffset(1439)).toBeNull();
        expect(checkOffset(-1439)).toBeNull();
    });

    it("lehnt Werte über 23:59 und Bruchteile von Minuten ab", () => {
        expect(checkOffset(1440)).toBe("Der Korrekturwert darf höchstens ±23:59 Stunden betragen");
        expect(checkOffset(-1440)).toBe("Der Korrekturwert darf höchstens ±23:59 Stunden betragen");
        expect(checkOffset(1.5)).toBe("Der Korrekturwert muss eine ganze Zahl von Minuten sein");
    });
});

describe("formatOffset", () => {
    it("zeigt Vorzeichen, Stunden und zweistellige Minuten", () => {
        expect(formatOffset(210)).toBe("+3:30");
        expect(formatOffset(-10)).toBe("−0:10");
        expect(formatOffset(0)).toBe("+0:00");
        expect(formatOffset(870)).toBe("+14:30");
    });
});

describe("balanceMinutes", () => {
    it("rundet den Betrag ab und behält das Vorzeichen", () => {
        expect(balanceMinutes(90.9 * MIN)).toBe(90);
        expect(balanceMinutes(-90.9 * MIN)).toBe(-90);
        expect(Object.is(balanceMinutes(-0.5 * MIN), 0)).toBe(true);
    });
});

describe("overtimeBalanceMs", () => {
    it("rechnet ohne Korrektur ab Beginn der Zeiterfassung", () => {
        expect(balance(null, firstWeek, "2026-10-10T10:00:00Z")).toBe(120 * MIN);
    });

    it("ist ohne Buchungen der Korrekturwert", () => {
        expect(balance(null, [], "2026-10-10T10:00:00Z")).toBe(0);
        // ohne Buchung hat die Zeiterfassung nicht begonnen, das Soll ist 0
        expect(balance({offset: 210, created: new Date("2026-10-12T07:00:00Z")}, [], "2026-10-12T08:00:00Z")).toBe(
            210 * MIN,
        );
    });

    const correction = {offset: 210, created: new Date("2026-10-12T07:00:00Z")}; // Mo 12.10. 09:00
    const secondWeek = [...worked("2026-10-12", 17), ...worked("2026-10-13", 17), ...worked("2026-10-14", 17)];

    it("rechnet ab dem Tag der Korrektur, heute mit vollem Soll", () => {
        // 3:30 + 3 × 1:00 − 8:00 am Do vor dem ersten Kommen; die erste Woche zählt nicht mehr
        expect(balance(correction, [...firstWeek, ...secondWeek], "2026-10-15T05:00:00Z")).toBe(-90 * MIN);
    });

    it("folgt einer nachträglich geänderten Buchung ohne neue Korrektur", () => {
        const changed = [...worked("2026-10-12", 17), ...worked("2026-10-13", 16), ...worked("2026-10-14", 17)];
        expect(balance(correction, [...firstWeek, ...changed], "2026-10-15T05:00:00Z")).toBe(-150 * MIN);
    });

    it("zählt Urlaubstage nach dem Tag der Korrektur ohne Soll", () => {
        const entries = [...firstWeek, ...worked("2026-10-12", 17), ...worked("2026-10-14", 17)];
        const vacation = [{startDate: "2026-10-13", endDate: "2026-10-13"}];
        const ms = overtimeBalanceMs(
            correction,
            entries,
            vacation,
            [],
            [],
            "2026-10-14",
            new Date("2026-10-14T20:00:00Z"),
        );
        expect(ms).toBe((210 + 60 + 60) * MIN);
    });
});
