// shared/user-setting-rules.test.ts
import {describe, expect, it} from "vitest";
import {day} from "./test-dates";
import {targetMs} from "./target-hours";
import {
    SHOW_ACTION_BAR_SETTING_ID,
    SOLL_SETTING_ID,
    type UserSetting,
    type UserSettingsData,
    VACATION_DAYS_SETTING_ID,
} from "./user-setting";
import {
    booleanSettingOf,
    checkChange,
    checkDelete,
    checkImmediateEdit,
    checkSettingValue,
    historyOf,
    type SettingHistory,
    settingStatus,
    valueOn,
} from "./user-setting-rules";
import {checkYearLimit, vacationBalance} from "./vacation-rules";

const TODAY = day("2026-10-26"); // Montag
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

const p = (id: string, validFrom: string, value: number | null) => ({id, validFrom: day(validFrom), value});
const history = (...values: ReturnType<typeof p>[]): SettingHistory => ({defaultValue: 8, values});

describe("valueOn (Regel 1)", () => {
    const h = history(p("a", "2026-03-01", 6), p("b", "2026-11-01", 7));

    it("ohne eigenen Wert gilt der Default", () => {
        expect(valueOn(history(), TODAY)).toBe(8);
        expect(valueOn(h, day("2026-02-28"))).toBe(8); // vor dem ersten eigenen Wert
    });

    it("es gilt der Wert mit dem größten gültig ab bis zu diesem Tag", () => {
        expect(valueOn(h, day("2026-03-01"))).toBe(6);
        expect(valueOn(h, day("2026-10-31"))).toBe(6);
        expect(valueOn(h, day("2026-11-01"))).toBe(7);
    });

    it("die Reihenfolge der Werte spielt keine Rolle", () => {
        expect(valueOn(history(p("b", "2026-11-01", 7), p("a", "2026-03-01", 6)), day("2026-12-01"))).toBe(7);
    });
});

describe("settingStatus (Regel 2)", () => {
    it("ohne eigenen Wert ist der Default aktuell", () => {
        expect(settingStatus(history(), null, TODAY)).toBe("aktuell");
    });

    it("ein Wert ab morgen ist geplant, der Default bleibt aktuell", () => {
        const h = history(p("a", "2026-10-27", 6));
        expect(settingStatus(h, day("2026-10-27"), TODAY)).toBe("geplant");
        expect(settingStatus(h, null, TODAY)).toBe("aktuell");
    });

    it("ab dem gültig ab ist der Wert aktuell, der vorherige abgelaufen", () => {
        const h = history(p("a", "2026-03-01", 6), p("b", "2026-10-26", 7));
        expect(settingStatus(h, day("2026-10-26"), TODAY)).toBe("aktuell");
        expect(settingStatus(h, day("2026-03-01"), TODAY)).toBe("abgelaufen");
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
        expect(checkChange(h, day("2026-12-01"), TODAY)).toBeNull();
        expect(checkDelete(h, day("2026-12-01"), TODAY)).toBeNull();
    });

    it("aktuelle und abgelaufene Werte nicht", () => {
        for (const validFrom of ["2026-03-01", "2026-10-26"].map(day)) {
            expect(checkChange(h, validFrom, TODAY)).not.toBeNull();
            expect(checkDelete(h, validFrom, TODAY)).not.toBeNull();
        }
    });
});

describe("Wert „Default“ (null)", () => {
    const h = history(p("a", "2026-03-01", 6), p("d", "2026-11-01", null), p("b", "2027-02-01", 7));

    it("ab dem Default gilt der Default, davor der eigene Wert, danach ein späterer eigener Wert", () => {
        expect(valueOn(h, day("2026-10-31"))).toBe(6);
        expect(valueOn(h, day("2026-11-01"))).toBe(8);
        expect(valueOn(h, day("2027-01-31"))).toBe(8);
        expect(valueOn(h, day("2027-02-01"))).toBe(7);
    });

    it("ein geänderter Default wirkt ab dem Wert „Default“ sofort", () => {
        expect(valueOn({...h, defaultValue: 7}, day("2026-12-01"))).toBe(7);
        expect(valueOn({...h, defaultValue: 7}, day("2026-10-01"))).toBe(6); // davor gilt der eigene Wert weiter
    });

    it("hat einen Status wie jeder Wert", () => {
        expect(settingStatus(h, day("2026-11-01"), TODAY)).toBe("geplant");
        expect(settingStatus(h, day("2026-11-01"), day("2026-11-01"))).toBe("aktuell");
    });

    it("ist erlaubt, wenn am Tag davor ein eigener Wert gilt", () => {
        expect(
            checkSettingValue(SOLL, [p("a", "2026-03-01", 6)], {value: null, validFrom: "2026-10-27"}, TODAY),
        ).toBeNull();
    });

    it("ohne eigenen Wert davor gilt schon der Default", () => {
        expect(checkSettingValue(SOLL, [], {value: null, validFrom: "2026-10-27"}, TODAY)).toBe(
            "Soll: ab dem 27.10.2026 gilt schon der Default",
        );
        // der eigene Wert beginnt erst nach dem Default
        expect(
            checkSettingValue(SOLL, [p("a", "2026-12-01", 6)], {value: null, validFrom: "2026-11-01"}, TODAY),
        ).toMatch(/gilt schon der Default/);
    });

    it("zwei „Default“ hintereinander werden abgelehnt", () => {
        const others = [p("a", "2026-03-01", 6), p("d", "2026-11-01", null)];
        expect(checkSettingValue(SOLL, others, {value: null, validFrom: "2026-12-01"}, TODAY)).toMatch(
            /gilt schon der Default/,
        );
    });

    it("es gelten die Regeln für „gültig ab“", () => {
        const others = [p("a", "2026-03-01", 6)];
        expect(checkSettingValue(SOLL, others, {value: null, validFrom: "2026-10-26"}, TODAY)).toMatch(
            /in der Zukunft/,
        );
        expect(
            checkSettingValue(VACATION_DAYS, [p("v", "2026-01-01", 28)], {value: null, validFrom: "2027-02-01"}, TODAY),
        ).toMatch(/1. Januar/);
        expect(
            checkSettingValue(VACATION_DAYS, [p("v", "2026-01-01", 28)], {value: null, validFrom: "2027-01-01"}, TODAY),
        ).toBeNull();
    });
});

describe("historyOf", () => {
    it("liest Default und Werte einer Einstellung aus den Daten der API", () => {
        const value = (id: string, settingId: string, v: string, validFrom: string) => ({
            id,
            userId: "u1",
            settingId,
            value: v,
            validFrom: day(validFrom),
        });
        const data = {
            settings: [{...SOLL, defaultValue: "7"}, VACATION_DAYS],
            values: [
                value("a", SOLL_SETTING_ID, "6", "2026-03-01"),
                value("b", VACATION_DAYS_SETTING_ID, "28", "2027-01-01"),
                {...value("c", SOLL_SETTING_ID, "", "2026-11-01"), value: null},
            ],
        };
        expect(historyOf(data, SOLL_SETTING_ID)).toEqual({
            defaultValue: 7,
            values: [p("a", "2026-03-01", 6), p("c", "2026-11-01", null)],
        });
    });

    it("ohne geladene Daten gelten 8 Stunden und 30 Urlaubstage", () => {
        expect(historyOf(undefined, SOLL_SETTING_ID)).toEqual({defaultValue: 8, values: []});
        expect(historyOf(undefined, VACATION_DAYS_SETTING_ID)).toEqual({defaultValue: 30, values: []});
    });
});

describe("Wertwechsel in den Berechnungen (Regeln 8 und 9)", () => {
    it("das Soll eines Tages kommt aus dem Wert, der an dem Tag gilt", () => {
        const soll = history(p("a", "2026-10-28", 6)); // ab Mittwoch 6 Stunden
        expect(targetMs(day("2026-10-27"), [], [], [], day("2026-01-01"), soll)).toBe(8 * HOUR);
        expect(targetMs(day("2026-10-28"), [], [], [], day("2026-01-01"), soll)).toBe(6 * HOUR);
        expect(targetMs(day("2026-10-31"), [], [], [], day("2026-01-01"), soll)).toBe(0); // Samstag
    });

    it("das Urlaubskonto rechnet je Jahr mit dem Wert vom 1. Januar", () => {
        const days: SettingHistory = {defaultValue: 30, values: [p("a", "2027-01-01", 25)]};
        expect(vacationBalance([], 2026, TODAY, [], [], days).unplanned).toBe(30);
        expect(vacationBalance([], 2027, TODAY, [], [], days).unplanned).toBe(25);

        const vacation = {id: "new", startDate: day("2027-01-04"), endDate: day("2027-02-05")}; // 25 Arbeitstage
        expect(checkYearLimit([], vacation, [], [], days)).toBeNull();
        const longer = {...vacation, endDate: day("2027-02-08")}; // 26 Arbeitstage
        expect(checkYearLimit([], longer, [], [], days)).toMatch(/erlaubt sind 25/);
    });
});

describe("Einstellung ohne Historie (Action Bar)", () => {
    const BAR: UserSetting = {
        id: SHOW_ACTION_BAR_SETTING_ID,
        name: "Action Bar",
        description: "Zeige die Action-Bar an",
        type: "boolean",
        unit: null,
        defaultValue: "true",
        validFromUnit: "immediately",
    };
    const check = (v: string | null, others = [] as ReturnType<typeof p>[], validFrom?: string) =>
        checkSettingValue(BAR, others, {value: v, validFrom}, TODAY);

    it("true, false und „Default“ nach eigenem Wert sind erlaubt", () => {
        expect(check("true")).toBeNull();
        expect(check("false")).toBeNull();
        expect(check(null, [p("a", "2026-10-01", Number.NaN)])).toBeNull();
    });

    it("andere Werte werden abgelehnt", () => {
        for (const v of ["ja", "1", ""]) expect(check(v)).toBe("Action Bar: bitte true oder false angeben");
    });

    it("gültig ab heute oder in der Vergangenheit ist auch mit eigenem Wert kein Problem", () => {
        const own = [p("a", "2026-10-01", Number.NaN)];
        expect(check("false", own, "2026-10-26")).toBeNull();
        expect(check("false", own, "2020-01-01")).toBeNull();
        expect(check("true", own)).toBeNull();
    });

    it("„Default“, wenn schon der Default gilt, wird abgelehnt", () => {
        expect(check(null)).toBe("Action Bar: es gilt schon der Default");
        expect(check(null, [p("a", "2026-10-01", null)])).toBe("Action Bar: es gilt schon der Default");
    });

    it("lässt sich nicht bearbeiten oder löschen, nur neu eintragen", () => {
        expect(checkImmediateEdit(BAR)).toBe("Action Bar: bitte einen neuen Wert eintragen");
        expect(checkImmediateEdit(SOLL)).toBeNull();
    });

    it("andere Einstellungen brauchen ein gültig ab", () => {
        expect(checkSettingValue(SOLL, [], {value: "6"}, TODAY)).toBe("Bitte „gültig ab“ angeben");
    });

    describe("booleanSettingOf", () => {
        const data = (value: string | null | undefined): UserSettingsData => ({
            settings: [BAR],
            values:
                value === undefined
                    ? []
                    : [{id: "a", userId: "u", settingId: BAR.id, value, validFrom: day("2026-10-01")}],
        });

        it("ohne Daten und ohne eigenen Wert gilt der Default true", () => {
            expect(booleanSettingOf(undefined, SHOW_ACTION_BAR_SETTING_ID)).toBe(true);
            expect(booleanSettingOf(data(undefined), SHOW_ACTION_BAR_SETTING_ID)).toBe(true);
        });

        it("mit eigenem Wert gilt dieser, nach „Default“ wieder der Default", () => {
            expect(booleanSettingOf(data("false"), SHOW_ACTION_BAR_SETTING_ID)).toBe(false);
            expect(booleanSettingOf(data(null), SHOW_ACTION_BAR_SETTING_ID)).toBe(true);
            const off = {...data(null), settings: [{...BAR, defaultValue: "false"}]};
            expect(booleanSettingOf(off, SHOW_ACTION_BAR_SETTING_ID)).toBe(false); // geänderter Default
        });
    });
});
