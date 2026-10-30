// shared/overtime-rules.test.ts
import {describe, expect, it} from "vitest";
import {localTimeToUtc} from "./day-range";
import {balanceMinutes, checkOffset, formatOffset, fromOffset, overtimeBalanceMs, toOffset} from "./overtime-rules";
import type {Booking} from "./time-rules";
import {defaultHistory} from "./user-setting-rules";

const SOLL = defaultHistory(8); // ohne eigene Werte

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
    overtimeBalanceMs(correction, entries, [], [], [], SOLL, now.slice(0, 10), new Date(now));

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

    it("rechnet ab dem Tag der Korrektur, heute vor dem ersten Gehen ohne Soll", () => {
        // 3:30 + 3 × 1:00 am Do vor dem ersten Kommen; die erste Woche zählt nicht mehr
        expect(balance(correction, [...firstWeek, ...secondWeek], "2026-10-15T05:00:00Z")).toBe(390 * MIN);
    });

    it("folgt einer nachträglich geänderten Buchung ohne neue Korrektur", () => {
        const changed = [...worked("2026-10-12", 17), ...worked("2026-10-13", 16), ...worked("2026-10-14", 17)];
        expect(balance(correction, [...firstWeek, ...changed], "2026-10-15T05:00:00Z")).toBe(330 * MIN);
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
            SOLL,
            "2026-10-14",
            new Date("2026-10-14T20:00:00Z"),
        );
        expect(ms).toBe((210 + 60 + 60) * MIN);
    });
});

describe("overtimeBalanceMs heute erst ab dem ersten Gehen", () => {
    // Winterzeit ab So 25.10.2026, die Uhrzeiten sind lokal (Europe/Berlin)
    const booking = (day: string, time: string, type: Booking["type"]): Booking => ({
        id: `${day}-${time}`,
        type,
        bookedAt: localTimeToUtc(day, time),
    });
    const at = (day: string, time: string) => localTimeToUtc(day, time).toISOString();
    const hours = (h: number) => h * 60 * MIN;

    // Mo 26.10. 10 h und Di 27.10. 11 h bei 8 h Soll: Di abends +5:00 h
    const monTue = [
        booking("2026-10-26", "08:00", "kommen"),
        booking("2026-10-26", "18:00", "gehen"),
        booking("2026-10-27", "08:00", "kommen"),
        booking("2026-10-27", "19:00", "gehen"),
    ];
    const wednesday = [
        booking("2026-10-28", "08:00", "kommen"),
        booking("2026-10-28", "12:00", "gehen"),
        booking("2026-10-28", "13:00", "kommen"),
        booking("2026-10-28", "16:00", "gehen"),
    ];
    const bookedUntil = (now: string) => [...monTue, ...wednesday].filter((e) => e.bookedAt.toISOString() <= now);

    it.each([
        ["2026-10-28", "00:00", 5], // Soll von Mi zählt noch nicht
        ["2026-10-28", "08:00", 5], // Kommen
        ["2026-10-28", "10:00", 7], // 5 h + 2 h laufende Arbeitszeit
        ["2026-10-28", "12:00", 1], // Gehen: 5 h + 4 h − 8 h Soll
        ["2026-10-28", "13:00", 1], // Kommen
        ["2026-10-28", "14:00", 2], // 5 h + 5 h − 8 h
        ["2026-10-28", "16:00", 4], // Gehen: 5 h + 7 h − 8 h
        ["2026-10-29", "00:00", 4], // Soll von Do zählt noch nicht
        ["2026-10-29", "18:00", 4], // ohne Gehen zählt das Soll von Do noch nicht
        ["2026-10-30", "00:00", -4], // Do ist vergangen: 4 h − 8 h Soll
    ])("am %s um %s beträgt der Saldo %i h", (day, time, expected) => {
        const now = at(day, time);
        expect(overtimeBalanceMs(null, bookedUntil(now), [], [], [], SOLL, day, new Date(now))).toBe(hours(expected));
    });

    it("zählt einen vergangenen Tag ohne Gehen mit vollem Soll", () => {
        // Mi vergessenes Ausstempeln: 5 h − 8 h
        const entries = [...monTue, booking("2026-10-28", "08:00", "kommen")];
        const now = at("2026-10-29", "07:00");
        expect(overtimeBalanceMs(null, entries, [], [], [], SOLL, "2026-10-29", new Date(now))).toBe(hours(-3));
    });

    it("zählt an einem Urlaubstag heute auch nach dem Gehen kein Soll", () => {
        const entries = [...monTue, booking("2026-10-28", "08:00", "kommen"), booking("2026-10-28", "10:00", "gehen")];
        const vacation = [{startDate: "2026-10-28", endDate: "2026-10-28"}];
        const now = at("2026-10-28", "11:00");
        expect(overtimeBalanceMs(null, entries, vacation, [], [], SOLL, "2026-10-28", new Date(now))).toBe(hours(7));
    });

    it("wendet am Tag der Korrektur dieselbe Regel an", () => {
        const correction = {offset: 210, created: localTimeToUtc("2026-10-28", "07:00")};
        const entries = [...monTue, booking("2026-10-28", "08:00", "kommen"), booking("2026-10-28", "12:00", "gehen")];
        const before = at("2026-10-28", "10:00");
        const after = at("2026-10-28", "12:00");
        // 3:30 + 2 h laufende Arbeitszeit, die Tage vor der Korrektur zählen nicht
        expect(
            overtimeBalanceMs(
                correction,
                entries.filter((e) => e.bookedAt.toISOString() <= before),
                [],
                [],
                [],
                SOLL,
                "2026-10-28",
                new Date(before),
            ),
        ).toBe(330 * MIN);
        // 3:30 + 4 h − 8 h Soll
        expect(overtimeBalanceMs(correction, entries, [], [], [], SOLL, "2026-10-28", new Date(after))).toBe(-30 * MIN);
    });
});
