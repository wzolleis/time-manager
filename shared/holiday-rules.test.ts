// shared/holiday-rules.test.ts
import {describe, expect, it} from "vitest";
import {checkHoliday, findHolidayClash, holidayClashMessage, holidayOn, isHoliday} from "./holiday-rules";

const ALICE = "275f12fb-e116-4857-9f12-fbe116b857fb";
const BOB = "8a1c2f0e-3b4d-4e5f-9a6b-7c8d9e0f1a2b";

const h = (id: string, userId: string | null, date: string, name = "Feiertag") => ({id, userId, date, name});

describe("isHoliday und holidayOn", () => {
    const holidays = [h("a", null, "2026-10-03", "Tag der Deutschen Einheit")];

    it("erkennt den Tag", () => {
        expect(isHoliday("2026-10-03", holidays)).toBe(true);
        expect(holidayOn("2026-10-03", holidays)?.name).toBe("Tag der Deutschen Einheit");
    });

    it("andere Tage nicht", () => {
        expect(isHoliday("2026-10-02", holidays)).toBe(false);
        expect(holidayOn("2026-10-02", holidays)).toBeUndefined();
        expect(isHoliday("2026-10-03", [])).toBe(false);
    });
});

describe("findHolidayClash", () => {
    const global = h("g", null, "2026-10-03");
    const aliceOwn = h("a", ALICE, "2026-11-01");

    it("zwei globale Feiertage am selben Tag kollidieren", () => {
        expect(findHolidayClash([global], h("new", null, "2026-10-03"))).toBe(global);
    });

    it("ein eigener Feiertag an einem globalen kollidiert", () => {
        expect(findHolidayClash([global], h("new", ALICE, "2026-10-03"))).toBe(global);
    });

    it("zwei eigene Feiertage desselben Users am selben Tag kollidieren", () => {
        expect(findHolidayClash([aliceOwn], h("new", ALICE, "2026-11-01"))).toBe(aliceOwn);
    });

    it("eigene Feiertage verschiedener User stören sich nicht", () => {
        expect(findHolidayClash([aliceOwn], h("new", BOB, "2026-11-01"))).toBeNull();
    });

    it("ein globaler Feiertag an einem eigenen Feiertag eines Users ist erlaubt", () => {
        expect(findHolidayClash([aliceOwn], h("new", null, "2026-11-01"))).toBeNull();
    });

    it("beim Bearbeiten nicht mit sich selbst", () => {
        expect(findHolidayClash([global], {...global, name: "Neu"})).toBeNull();
    });

    it("andere Tage stören nicht", () => {
        expect(findHolidayClash([global], h("new", null, "2026-10-04"))).toBeNull();
    });
});

describe("holidayClashMessage", () => {
    it("unterscheidet globale und eigene Feiertage", () => {
        expect(holidayClashMessage(h("g", null, "2026-10-03", "Einheit"))).toBe(
            "Am 03.10.2026 ist bereits der Feiertag „Einheit“ für alle eingetragen",
        );
        expect(holidayClashMessage(h("a", ALICE, "2026-11-01", "Allerheiligen"))).toBe(
            "Am 01.11.2026 ist bereits der Feiertag „Allerheiligen“ eingetragen",
        );
    });
});

describe("checkHoliday", () => {
    it("akzeptiert Datum und Namen", () => {
        expect(checkHoliday("2026-10-03", "Tag der Deutschen Einheit")).toBeNull();
    });
    it("verlangt ein gültiges Datum", () => {
        expect(checkHoliday("", "Feiertag")).toBe("Bitte ein Datum wählen");
        expect(checkHoliday("2026-02-30", "Feiertag")).toBe("Bitte ein Datum wählen");
    });
    it("verlangt einen Namen", () => {
        expect(checkHoliday("2026-10-03", "  ")).toBe("Bitte einen Namen angeben");
    });
});
