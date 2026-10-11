// src/lib/format.test.ts
import {describe, expect, it} from "vitest";
import {formatDifference, formatDuration} from "./format";

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