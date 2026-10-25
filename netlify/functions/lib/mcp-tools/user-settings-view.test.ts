import {describe, expect, it} from "vitest";
import {SOLL_SETTING_ID, type UserSettingsData, VACATION_DAYS_SETTING_ID} from "../../../../shared/user-setting";
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
        {id: "b", userId: "u1", settingId: SOLL_SETTING_ID, value: "7", validFrom: "2026-11-01"},
        {id: "a", userId: "u1", settingId: SOLL_SETTING_ID, value: "6", validFrom: "2026-03-01"},
    ],
};

describe("userSettingsReport", () => {
    const r = userSettingsReport(data, "2026-10-26");

    it("liefert je Einstellung den heutigen Wert, den Default und die Werte mit Status", () => {
        expect(UserSettingsReportSchema.parse(r.structured)).toEqual(r.structured);
        const [soll, days] = r.structured.settings;
        expect(soll).toMatchObject({name: "Soll", current: 6, defaultValue: 8, defaultStatus: "abgelaufen"});
        expect(soll.values).toEqual([
            {id: "a", value: 6, validFrom: "2026-03-01", status: "aktuell"},
            {id: "b", value: 7, validFrom: "2026-11-01", status: "geplant"},
        ]);
        expect(days).toMatchObject({name: "Urlaubstage", current: 30, defaultStatus: "aktuell", values: []});
    });

    it("zeigt im Text eine Tabelle mit Wert, gültig ab, Status und ID", () => {
        expect(r.text).toContain("| Soll | 8 Stunden | – | abgelaufen |  |");
        expect(r.text).toContain("| Soll | 7 Stunden | 01.11.2026 | geplant | b |");
        expect(r.text).toContain("| Urlaubstage | 30 Tage | – | aktuell |  |");
    });
});
