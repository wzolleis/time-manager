import {describe, expect, it} from "vitest";
import {day} from "@shared/test-dates";
import {
    SHOW_ACTION_BAR_SETTING_ID,
    SOLL_SETTING_ID,
    type UserSettingsData,
    VACATION_DAYS_SETTING_ID,
} from "@shared/user-setting";
import {userSettingsReport, UserSettingsReportSchema} from "./user-settings-view";

const data: UserSettingsData = {
    settings: [
        {
            id: SOLL_SETTING_ID,
            name: "Soll",
            description: "Stunden pro Tag",
            type: "number",
            unit: "hour",
            defaultValue: "8",
            validFromUnit: "day",
        },
        {
            id: VACATION_DAYS_SETTING_ID,
            name: "Urlaubstage",
            description: "pro Jahr",
            type: "number",
            unit: "day",
            defaultValue: "30",
            validFromUnit: "year",
        },
    ],
    values: [
        {id: "b", userId: "u1", settingId: SOLL_SETTING_ID, value: "7", validFrom: day("2026-11-01")},
        {id: "a", userId: "u1", settingId: SOLL_SETTING_ID, value: "6", validFrom: day("2026-03-01")},
        {id: "d", userId: "u1", settingId: SOLL_SETTING_ID, value: null, validFrom: day("2027-01-01")},
    ],
};

describe("userSettingsReport", () => {
    const r = userSettingsReport(data, day("2026-10-26"));

    it("liefert je Einstellung den heutigen Wert, den Default und die Werte mit Status", () => {
        expect(UserSettingsReportSchema.parse(r.structured)).toEqual(r.structured);
        const [soll, days] = r.structured.settings;
        expect(soll).toMatchObject({name: "Soll", current: 6, defaultValue: 8, defaultStatus: "abgelaufen"});
        expect(soll.values).toEqual([
            {id: "a", value: 6, validFrom: day("2026-03-01"), status: "aktuell"},
            {id: "b", value: 7, validFrom: day("2026-11-01"), status: "geplant"},
            {id: "d", value: null, validFrom: day("2027-01-01"), status: "geplant"},
        ]);
        expect(days).toMatchObject({name: "Urlaubstage", current: 30, defaultStatus: "aktuell", values: []});
    });

    it("zeigt im Text eine Tabelle mit Wert, gültig ab, Status und ID", () => {
        expect(r.text).toContain("| Soll | 8 Stunden | – | abgelaufen |  |");
        expect(r.text).toContain("| Soll | 7 Stunden | 01.11.2026 | geplant | b |");
        expect(r.text).toContain("| Urlaubstage | 30 Tage | – | aktuell |  |");
        expect(r.text).toContain("| Soll | Default (8 Stunden) | 01.01.2027 | geplant | d |");
    });
});

describe("userSettingsReport mit Action Bar", () => {
    const bar = {
        id: SHOW_ACTION_BAR_SETTING_ID,
        name: "Action Bar",
        description: "Zeige die Action-Bar an",
        type: "boolean" as const,
        unit: null,
        defaultValue: "true",
        validFromUnit: "immediately" as const,
    };
    const report = (value?: string | null) =>
        userSettingsReport(
            {
                settings: [bar],
                values:
                    value === undefined
                        ? []
                        : [{id: "x", userId: "u1", settingId: bar.id, value, validFrom: day("2026-10-20")}],
            },
            day("2026-10-26"),
        );

    it("ohne eigenen Wert gilt der Default „Ja“", () => {
        const r = report();
        expect(UserSettingsReportSchema.parse(r.structured)).toEqual(r.structured);
        expect(r.structured.settings[0]).toMatchObject({current: true, defaultValue: true, defaultStatus: "aktuell"});
        expect(r.text).toContain("| Action Bar | Ja | – | aktuell |  |");
    });

    it("zeigt den eigenen Wert in einer Zeile, ohne Zeile für den Default", () => {
        const r = report("false");
        expect(r.structured.settings[0]).toMatchObject({
            current: false,
            defaultStatus: "abgelaufen",
            values: [{id: "x", value: false, validFrom: "2026-10-20", status: "aktuell"}],
        });
        expect(r.text).toContain("| Action Bar | Nein | 20.10.2026 | aktuell | x |");
        expect(r.text.match(/Action Bar/g)).toHaveLength(1);
    });

    it("„Default“ zeigt den Default", () => {
        expect(report(null).text).toContain("| Action Bar | Default (Ja) | 20.10.2026 | aktuell | x |");
    });
});
