// netlify/functions/lib/mcp-tools/user-settings-view.ts
// Einstellungen für den MCP-Server, mit denselben Regeln wie die Seite „Einstellungen“. Ohne DB, damit testbar.
import {z} from "zod";
import type {Day} from "@shared/date-schemas";
import {formatDay} from "@shared/format";
import type {UserSetting, UserSettingsData} from "@shared/user-setting";
import {
    booleanSettingOf,
    booleanText,
    historyOf,
    isImmediate,
    settingStatus,
    valueOn,
} from "@shared/user-setting-rules";
import {mdTable} from "./view";

const StatusSchema = z.enum(["aktuell", "geplant", "abgelaufen"]);
const ValueSchema = z.union([z.number(), z.boolean()]);

export const UserSettingsReportSchema = z.object({
    settings: z.array(
        z.object({
            name: z.string().describe("Name für set_user_setting, z. B. Soll, Urlaubstage oder show_action_bar"),
            description: z.string(),
            unit: z.enum(["hour", "day"]).nullable(),
            validFromUnit: z
                .enum(["day", "year", "immediately"])
                .describe("year: gültig ab muss ein 1. Januar sein; immediately: ohne Historie, gilt sofort"),
            current: ValueSchema.describe("Wert, der heute gilt"),
            defaultValue: ValueSchema,
            defaultStatus: StatusSchema.describe("Status des Defaults: abgelaufen, sobald ein eigener Wert gilt"),
            values: z.array(
                z.object({
                    id: z.string().describe("ID für change_user_setting und delete_user_setting"),
                    value: ValueSchema.nullable().describe("null: „Default“, ab validFrom gilt wieder der Default"),
                    validFrom: z.string().describe("Tag JJJJ-MM-TT, ab dem der Wert gilt"),
                    status: StatusSchema.describe("nur geplante Werte lassen sich ändern und löschen"),
                }),
            ),
        }),
    ),
});

const UNIT_TEXT = {hour: "Stunden", day: "Tage"} as const;

/** Einstellung ohne Historie (immediately): höchstens ein eigener Wert, er ist aktuell */
function immediateReport(data: UserSettingsData, s: UserSetting) {
    const own = data.values.filter((v) => v.settingId === s.id);
    const parse = (value: string | null) =>
        value === null ? null : s.type === "boolean" ? value === "true" : Number(value);
    return {
        name: s.name,
        description: s.description,
        unit: s.unit,
        validFromUnit: s.validFromUnit,
        current: s.type === "boolean" ? booleanSettingOf(data, s.id) : Number(own[0]?.value ?? s.defaultValue),
        defaultValue: parse(s.defaultValue)!,
        defaultStatus: own.some((v) => v.value !== null) ? ("abgelaufen" as const) : ("aktuell" as const),
        values: own.map((v) => ({id: v.id, value: parse(v.value), validFrom: v.validFrom, status: "aktuell" as const})),
    };
}

const valueTextOf = (value: number | boolean, unit: string) =>
    typeof value === "boolean" ? booleanText(String(value)) : `${value}${unit}`;

export function userSettingsReport(data: UserSettingsData, today: Day) {
    const settings = data.settings.map((s) => {
        if (isImmediate(s)) return immediateReport(data, s);
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
        const defaultText = valueTextOf(s.defaultValue, unit);
        const valueRows = s.values.map((v) => [
            s.name,
            v.value === null ? `Default (${defaultText})` : valueTextOf(v.value, unit),
            formatDay(v.validFrom),
            v.status,
            v.id,
        ]);
        // Ohne Historie eine Zeile je Einstellung: der eigene Wert, sonst der Default
        if (s.validFromUnit === "immediately" && valueRows.length > 0) return valueRows;
        return [[s.name, defaultText, "–", s.defaultStatus, ""], ...valueRows];
    });
    const text = mdTable(["Name", "Wert", "gültig ab", "Status", "ID"], rows);
    return {structured: {settings} satisfies z.infer<typeof UserSettingsReportSchema>, text};
}
