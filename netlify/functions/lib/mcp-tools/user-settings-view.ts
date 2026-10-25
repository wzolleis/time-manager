// netlify/functions/lib/mcp-tools/user-settings-view.ts
// Einstellungen für den MCP-Server, mit denselben Regeln wie die Seite „Einstellungen“. Ohne DB, damit testbar.
import {z} from "zod";
import type {UserSettingsData} from "../../../../shared/user-setting";
import {historyOf, settingStatus, valueOn} from "../../../../shared/user-setting-rules";
import {germanDay} from "../../../../shared/vacation-rules";
import {mdTable} from "./view";

const StatusSchema = z.enum(["aktuell", "geplant", "abgelaufen"]);

export const UserSettingsReportSchema = z.object({
    settings: z.array(
        z.object({
            name: z.string().describe("Name für set_user_setting, z. B. Soll oder Urlaubstage"),
            description: z.string(),
            unit: z.enum(["hour", "day"]).nullable(),
            validFromUnit: z.enum(["day", "year"]).describe("year: gültig ab muss ein 1. Januar sein"),
            current: z.number().describe("Wert, der heute gilt"),
            defaultValue: z.number(),
            defaultStatus: StatusSchema.describe("Status des Defaults: abgelaufen, sobald ein eigener Wert gilt"),
            values: z.array(
                z.object({
                    id: z.string().describe("ID für change_user_setting und delete_user_setting"),
                    value: z.number(),
                    validFrom: z.string().describe("Tag JJJJ-MM-TT, ab dem der Wert gilt"),
                    status: StatusSchema.describe("nur geplante Werte lassen sich ändern und löschen"),
                }),
            ),
        }),
    ),
});

const UNIT_TEXT = {hour: "Stunden", day: "Tage"} as const;

export function userSettingsReport(data: UserSettingsData, today: string) {
    const settings = data.settings.map((s) => {
        const history = historyOf(data, s.id);
        return {
            name: s.name,
            description: s.description,
            unit: s.unit,
            validFromUnit: s.validFromUnit,
            current: valueOn(history, today),
            defaultValue: history.defaultValue,
            defaultStatus: settingStatus(history, null, today),
            values: [...history.values]
                .sort((a, b) => a.validFrom.localeCompare(b.validFrom))
                .map((p) => ({
                    id: p.id,
                    value: p.value,
                    validFrom: p.validFrom,
                    status: settingStatus(history, p.validFrom, today),
                })),
        };
    });

    const rows = settings.flatMap((s) => {
        const unit = s.unit ? ` ${UNIT_TEXT[s.unit]}` : "";
        return [
            [s.name, `${s.defaultValue}${unit}`, "–", s.defaultStatus, ""],
            ...s.values.map((v) => [s.name, `${v.value}${unit}`, germanDay(v.validFrom), v.status, v.id]),
        ];
    });
    const text = mdTable(["Name", "Wert", "gültig ab", "Status", "ID"], rows);
    return {structured: {settings} satisfies z.infer<typeof UserSettingsReportSchema>, text};
}
