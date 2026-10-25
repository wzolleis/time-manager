// shared/user-setting-rules.test.ts
import {describe, expect, it} from "vitest";
import {targetMs} from "./target-hours";
import {SOLL_SETTING_ID, type UserSetting, VACATION_DAYS_SETTING_ID} from "./user-setting";
import {
    checkChange,
    checkDelete,
    checkSettingValue,
    historyOf,
    type SettingHistory,
    settingStatus,
    valueOn,
} from "./user-setting-rules";
import {checkYearLimit, vacationBalance} from "./vacation-rules";

const TODAY = "2026-10-26"; // Montag
const HOUR = 3_600_000;

const SOLL: UserSetting = {
    id: SOLL_SETTING_ID,
    name: "Soll",
    description: "",
    type: "number",
    unit: "hour",
    defaultValue: "8",
    validFromUnit: "day",
};
const VACATION_DAYS: UserSetting = {
    ...SOLL,
    id: VACATION_DAYS_SETTING_ID,
    name: "Urlaubstage",
    unit: "day",
    defaultValue: "30",
    validFromUnit: "year",
};

const p = (id: string, validFrom: string, value: number) => ({id, validFrom, value});
const history = (...values: ReturnType<typeof p>[]): SettingHistory => ({defaultValue: 8, values});

describe("valueOn (Regel 1)", () => {
    const h = history(p("a", "2026-03-01", 6), p("b", "2026-11-01", 7));

    it("ohne eigenen Wert gilt der Default", () => {
        expect(valueOn(history(), TODAY)).toBe(8);
        expect(valueOn(h, "2026-02-28")).toBe(8); // vor dem ersten eigenen Wert
    });

    it("es gilt der Wert mit dem größten gültig ab bis zu diesem Tag", () => {
        expect(valueOn(h, "2026-03-01")).toBe(6);
        expect(valueOn(h, "2026-10-31")).toBe(6);
        expect(valueOn(h, "2026-11-01")).toBe(7);
    });

    it("die Reihenfolge der Werte spielt keine Rolle", () => {
        expect(valueOn(history(p("b", "2026-11-01", 7), p("a", "2026-03-01", 6)), "2026-12-01")).toBe(7);
    });
});

describe("settingStatus (Regel 2)", () => {
    it("ohne eigenen Wert ist der Default aktuell", () => {
        expect(settingStatus(history(), null, TODAY)).toBe("aktuell");
    });

    it("ein Wert ab morgen ist geplant, der Default bleibt aktuell", () => {
        const h = history(p("a", "2026-10-27", 6));
        expect(settingStatus(h, "2026-10-27", TODAY)).toBe("geplant");
        expect(settingStatus(h, null, TODAY)).toBe("aktuell");
    });

    it("ab dem gültig ab ist der Wert aktuell, der vorherige abgelaufen", () => {
        const h = history(p("a", "2026-03-01", 6), p("b", "2026-10-26", 7));
        expect(settingStatus(h, "2026-10-26", TODAY)).toBe("aktuell");
        expect(settingStatus(h, "2026-03-01", TODAY)).toBe("abgelaufen");
        expect(settingStatus(h, null, TODAY)).toBe("abgelaufen");
    });
});

describe("checkSettingValue (Regeln 3 bis 6)", () => {
    const value = (v: string, validFrom: string) => ({value: v, validFrom});

    it("ein Wert ab morgen ist erlaubt", () => {
        expect(checkSettingValue(SOLL, [p("a", "2026-03-01", 6)], value("7", "2026-10-27"), TODAY)).toBeNull();
    });

    it("der erste eigene Wert darf rückwirkend gelten, auch ab heute", () => {
        expect(checkSettingValue(SOLL, [], value("6", "2025-01-01"), TODAY)).toBeNull();
        expect(checkSettingValue(SOLL, [], value("6", TODAY), TODAY)).toBeNull();
    });

    it("mit eigenem Wert ist heute oder die Vergangenheit nicht erlaubt", () => {
        const others = [p("a", "2026-03-01", 6)];
        expect(checkSettingValue(SOLL, others, value("7", TODAY), TODAY)).toMatch(/in der Zukunft/);
        expect(checkSettingValue(SOLL, others, value("7", "2026-05-01"), TODAY)).toMatch(/in der Zukunft/);
    });

    it("Urlaubstage gelten nur ab einem 1. Januar", () => {
        expect(checkSettingValue(VACATION_DAYS, [], value("28", "2027-01-01"), TODAY)).toBeNull();
        expect(checkSettingValue(VACATION_DAYS, [], value("28", "2027-02-01"), TODAY)).toMatch(/1\. Januar/);
        // der erste eigene Wert auch für das laufende Jahr
        expect(checkSettingValue(VACATION_DAYS, [], value("28", "2026-01-01"), TODAY)).toBeNull();
    });

    it("ein gültig ab je Einstellung nur einmal", () => {
        const others = [p("a", "2026-11-01", 6)];
        expect(checkSettingValue(SOLL, others, value("7", "2026-11-01"), TODAY)).toBe(
            "Für Soll gibt es ab dem 01.11.2026 schon einen Wert",
        );
    });

    it("nur ganze Zahlen, Soll 1 bis 10, Urlaubstage nicht negativ", () => {
        const check = (s: UserSetting, v: string) => checkSettingValue(s, [], value(v, "2027-01-01"), TODAY);
        expect(check(SOLL, "7.5")).toMatch(/ganze Zahl/);
        expect(check(SOLL, "abc")).toMatch(/ganze Zahl/);
        expect(check(SOLL, "-1")).toMatch(/ganze Zahl/);
        expect(check(SOLL, "0")).toBe("Soll muss zwischen 1 und 10 liegen");
        expect(check(SOLL, "11")).toBe("Soll muss zwischen 1 und 10 liegen");
        expect(check(SOLL, "1")).toBeNull();
        expect(check(SOLL, "10")).toBeNull();
        expect(check(VACATION_DAYS, "0")).toBeNull();
    });

    it("ungültiges Datum", () => {
        expect(checkSettingValue(SOLL, [], value("8", "2026-02-30"), TODAY)).toBe("Ungültiges Datum");
    });
});

describe("checkChange und checkDelete (Regel 7)", () => {
    const h = history(p("a", "2026-03-01", 6), p("b", "2026-10-26", 7), p("c", "2026-12-01", 8));

    it("geplante Werte lassen sich ändern und löschen", () => {
        expect(checkChange(h, "2026-12-01", TODAY)).toBeNull();
        expect(checkDelete(h, "2026-12-01", TODAY)).toBeNull();
    });

    it("aktuelle und abgelaufene Werte nicht", () => {
        for (const validFrom of ["2026-03-01", "2026-10-26"]) {
            expect(checkChange(h, validFrom, TODAY)).not.toBeNull();
            expect(checkDelete(h, validFrom, TODAY)).not.toBeNull();
        }
    });
});

describe("historyOf", () => {
    it("liest Default und Werte einer Einstellung aus den Daten der API", () => {
        const value = (id: string, settingId: string, v: string, validFrom: string) => ({
            id,
            userId: "u1",
            settingId,
            value: v,
            validFrom,
        });
        const data = {
            settings: [{...SOLL, defaultValue: "7"}, VACATION_DAYS],
            values: [
                value("a", SOLL_SETTING_ID, "6", "2026-03-01"),
                value("b", VACATION_DAYS_SETTING_ID, "28", "2027-01-01"),
            ],
        };
        expect(historyOf(data, SOLL_SETTING_ID)).toEqual({defaultValue: 7, values: [p("a", "2026-03-01", 6)]});
    });

    it("ohne geladene Daten gelten 8 Stunden und 30 Urlaubstage", () => {
        expect(historyOf(undefined, SOLL_SETTING_ID)).toEqual({defaultValue: 8, values: []});
        expect(historyOf(undefined, VACATION_DAYS_SETTING_ID)).toEqual({defaultValue: 30, values: []});
    });
});

describe("Wertwechsel in den Berechnungen (Regeln 8 und 9)", () => {
    it("das Soll eines Tages kommt aus dem Wert, der an dem Tag gilt", () => {
        const soll = history(p("a", "2026-10-28", 6)); // ab Mittwoch 6 Stunden
        expect(targetMs("2026-10-27", [], [], [], "2026-01-01", soll)).toBe(8 * HOUR);
        expect(targetMs("2026-10-28", [], [], [], "2026-01-01", soll)).toBe(6 * HOUR);
        expect(targetMs("2026-10-31", [], [], [], "2026-01-01", soll)).toBe(0); // Samstag
    });

    it("das Urlaubskonto rechnet je Jahr mit dem Wert vom 1. Januar", () => {
        const days: SettingHistory = {defaultValue: 30, values: [p("a", "2027-01-01", 25)]};
        expect(vacationBalance([], 2026, TODAY, [], [], days).unplanned).toBe(30);
        expect(vacationBalance([], 2027, TODAY, [], [], days).unplanned).toBe(25);

        const vacation = {id: "new", startDate: "2027-01-04", endDate: "2027-02-05"}; // 25 Arbeitstage
        expect(checkYearLimit([], vacation, [], [], days)).toBeNull();
        const longer = {...vacation, endDate: "2027-02-08"}; // 26 Arbeitstage
        expect(checkYearLimit([], longer, [], [], days)).toMatch(/erlaubt sind 25/);
    });
});
