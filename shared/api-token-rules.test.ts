import {describe, expect, it} from "vitest";
import {checkTokenName, isTokenExpired, tokenExpiry} from "./api-token-rules";

const created = new Date("2026-10-19T06:00:00Z");

describe("tokenExpiry", () => {
    it("rechnet die Gültigkeit in Kalendertagen ab dem Erzeugen, zur selben lokalen Uhrzeit", () => {
        // 19.10.2026 08:00 MESZ, 90 Tage später: 17.01.2027 08:00 MEZ
        expect(tokenExpiry(created, 90)).toEqual(new Date("2027-01-17T07:00:00Z"));
        // 365 Tage später wieder in der Sommerzeit: 19.10.2027 08:00 MESZ
        expect(tokenExpiry(created, 365)).toEqual(new Date("2027-10-19T06:00:00Z"));
    });

    it("behält die lokale Uhrzeit über die Zeitumstellung im Herbst", () => {
        // Umstellung am 25.10.2026: 30 Tage nach 08:00 MESZ ist 08:00 MEZ, nicht 07:00 wie mit 30 × 24 Stunden
        expect(tokenExpiry(created, 30)).toEqual(new Date("2026-11-18T07:00:00Z"));
    });

    it("behält die lokale Uhrzeit über die Zeitumstellung im Frühjahr", () => {
        // 10.03.2027 08:00 MEZ, Umstellung am 28.03.2027: 30 Tage später ist 09.04.2027 08:00 MESZ
        expect(tokenExpiry(new Date("2027-03-10T07:00:00Z"), 30)).toEqual(new Date("2027-04-09T06:00:00Z"));
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
