// shared/format.test.ts
import {describe, expect, it} from "vitest";
import {formatDifference, formatDuration, formatMonth, formatMonthName} from "./format";

const MIN = 60_000;

describe("formatDuration", () => {
    it("lässt Minuten bei vollen Stunden weg", () => {
        expect(formatDuration(8 * 60 * MIN)).toBe("8 Std");
    });
    it("zeigt Stunden und Minuten", () => {
        expect(formatDuration(80 * MIN)).toBe("1 Std 20 Min");
    });
    it("zeigt unter einer Stunde nur Minuten", () => {
        expect(formatDuration(45 * MIN)).toBe("45 Min");
        expect(formatDuration(0)).toBe("0 Min");
    });
});

describe("formatDifference", () => {
    it("setzt ein Plus", () => {
        expect(formatDifference(80 * MIN)).toBe("+1 Std 20 Min");
    });
    it("setzt ein Minus", () => {
        expect(formatDifference(-120 * MIN)).toBe("−2 Std");
    });
    it("zeigt ±0 bei weniger als einer Minute", () => {
        expect(formatDifference(0)).toBe("±0 Min");
        expect(formatDifference(30_000)).toBe("±0 Min");
        expect(formatDifference(-30_000)).toBe("±0 Min");
    });
});

// Beispiele aus features/use-case/industriezeit.md
describe("Industriezeit", () => {
    const I = "industrial";
    it("zeigt Dauern als Stunden mit zwei Nachkommastellen", () => {
        expect(formatDuration(510 * MIN, I)).toBe("8,50 h");
        expect(formatDuration(480 * MIN, I)).toBe("8,00 h");
        expect(formatDuration(45 * MIN, I)).toBe("0,75 h");
        expect(formatDuration(0, I)).toBe("0,00 h");
        expect(formatDuration(140 * MIN, I)).toBe("2,33 h");
    });
    it("rundet erst auf ganze Minuten ab, dann auf zwei Stellen (Regel 4)", () => {
        expect(formatDuration(500 * MIN, I)).toBe("8,33 h");
        expect(formatDuration(1 * MIN, I)).toBe("0,02 h");
        expect(formatDuration(59 * MIN, I)).toBe("0,98 h");
        expect(formatDuration(59.9 * MIN, I)).toBe("0,98 h");
    });
    it("setzt bei der Differenz ein Vorzeichen (Regel 3)", () => {
        expect(formatDifference(30 * MIN, I)).toBe("+0,50 h");
        expect(formatDifference(-75 * MIN, I)).toBe("−1,25 h");
        expect(formatDifference(0, I)).toBe("±0,00 h");
        expect(formatDifference(-30_000, I)).toBe("±0,00 h");
    });
});

describe("formatMonthName", () => {
    it("nennt nur den Monat", () => {
        expect(formatMonthName("2026-10")).toBe("Oktober");
        expect(formatMonthName("2027-01")).toBe("Januar");
    });
});

describe("formatMonth", () => {
    it("schreibt den Monat aus, auch am Jahresanfang und -ende", () => {
        expect(formatMonth("2026-10")).toBe("Oktober 2026");
        expect(formatMonth("2027-01")).toBe("Januar 2027");
        expect(formatMonth("2026-12")).toBe("Dezember 2026");
    });
});
