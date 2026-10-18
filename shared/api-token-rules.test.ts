import {describe, expect, it} from "vitest";
import {checkTokenName, isTokenExpired, tokenExpiry} from "./api-token-rules";

const created = new Date("2026-10-19T06:00:00Z");

describe("tokenExpiry", () => {
    it("rechnet die Gültigkeit in Tagen ab dem Erzeugen", () => {
        expect(tokenExpiry(created, 30)).toEqual(new Date("2026-11-18T06:00:00Z"));
        expect(tokenExpiry(created, 365)).toEqual(new Date("2027-10-19T06:00:00Z"));
    });

    it("liefert null ohne Ablauf", () => {
        expect(tokenExpiry(created, null)).toBeNull();
    });
});

describe("isTokenExpired", () => {
    it("ist ab dem Zeitpunkt des Ablaufs abgelaufen", () => {
        expect(isTokenExpired("2026-10-19T06:00:00Z", new Date("2026-10-19T05:59:59Z"))).toBe(false);
        expect(isTokenExpired("2026-10-19T06:00:00Z", new Date("2026-10-19T06:00:00Z"))).toBe(true);
    });

    it("läuft ohne Ablauf nie ab", () => {
        expect(isTokenExpired(null, new Date("2100-01-01T00:00:00Z"))).toBe(false);
    });
});

describe("checkTokenName", () => {
    it("verlangt einen Namen, Leerzeichen zählen nicht", () => {
        expect(checkTokenName("   ")).not.toBeNull();
        expect(checkTokenName("Claude Code Laptop")).toBeNull();
    });
});
