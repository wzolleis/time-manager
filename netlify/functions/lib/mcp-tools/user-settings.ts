// netlify/functions/lib/mcp-tools/user-settings.ts
// Tools der Einstellungen: anzeigen, neuen Wert eintragen, geplanten Wert ändern oder löschen, wie auf der
// Seite „Einstellungen“. Die Regeln prüft lib/user-settings-store.ts wie bei der REST-API.
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {localDay} from "../../../../shared/time-rules";
import {RuleError} from "../rule-error";
import type {SessionUser} from "../session";
import {addSettingValue, changeSettingValue, deleteSettingValue, listUserSettings} from "../user-settings-store";
import {DaySchema} from "./time-entries";
import {userSettingsReport, UserSettingsReportSchema} from "./user-settings-view";
import {ok, run} from "./view";

const report = async (userId: string) => userSettingsReport(await listUserSettings(userId), localDay(new Date()));

const RULES =
    "Ein neuer Wert gilt frühestens ab morgen, nur der erste eigene Wert einer Einstellung darf auch rückwirkend " +
    "gelten. Urlaubstage gelten immer ab dem 1. Januar. Nur ganze Zahlen, Soll 1 bis 10 Stunden.";

export function registerUserSettingTools(server: McpServer, user: SessionUser): void {
    server.registerTool(
        "list_user_settings",
        {
            title: "Einstellungen",
            description:
                "Einstellungen des Users (Soll in Stunden pro Tag, Urlaubstage pro Jahr) mit Default, eigenen " +
                "Werten, gültig ab und Status (aktuell, geplant, abgelaufen). Abgelaufene Werte gelten für die " +
                "Vergangenheit weiter.",
            outputSchema: UserSettingsReportSchema,
            annotations: {readOnlyHint: true},
        },
        () =>
            run(async () => {
                const r = await report(user.id);
                return ok(r.text, r.structured);
            }),
    );

    server.registerTool(
        "set_user_setting",
        {
            title: "Einstellung ändern",
            description: `Trägt einen neuen Wert zu einer Einstellung ein. Der bisherige Wert gilt bis zum Tag davor. ${RULES}`,
            inputSchema: {
                name: z.string().describe("Name der Einstellung aus list_user_settings, z. B. Soll"),
                value: z.number().int(),
                validFrom: DaySchema.describe("Tag JJJJ-MM-TT, ab dem der Wert gilt"),
            },
            outputSchema: UserSettingsReportSchema,
            annotations: {destructiveHint: false, idempotentHint: false},
        },
        ({name, value, validFrom}) =>
            run(async () => {
                const {settings} = await listUserSettings(user.id);
                const setting = settings.find((s) => s.name.toLowerCase() === name.toLowerCase());
                if (!setting) {
                    throw new RuleError(`Unbekannte Einstellung, möglich: ${settings.map((s) => s.name).join(", ")}`);
                }
                await addSettingValue(user.id, {settingId: setting.id, value: String(value), validFrom});
                const r = await report(user.id);
                return ok(`Gespeichert.\n${r.text}`, r.structured);
            }),
    );

    server.registerTool(
        "change_user_setting",
        {
            title: "Geplanten Wert ändern",
            description: `Ändert Wert oder gültig ab eines geplanten Werts. Aktuelle und abgelaufene Werte lassen sich nicht ändern. ${RULES}`,
            inputSchema: {
                id: z.uuid().describe("ID des Werts aus list_user_settings"),
                value: z.number().int().optional(),
                validFrom: DaySchema.optional().describe("Tag JJJJ-MM-TT"),
            },
            outputSchema: UserSettingsReportSchema,
            annotations: {destructiveHint: true, idempotentHint: true},
        },
        ({id, value, validFrom}) =>
            run(async () => {
                await changeSettingValue(user.id, id, {
                    ...(value !== undefined && {value: String(value)}),
                    ...(validFrom !== undefined && {validFrom}),
                });
                const r = await report(user.id);
                return ok(`Geändert.\n${r.text}`, r.structured);
            }),
    );

    server.registerTool(
        "delete_user_setting",
        {
            title: "Geplanten Wert löschen",
            description:
                "Löscht einen geplanten Wert. Aktuelle und abgelaufene Werte lassen sich nicht löschen, sie " +
                "gelten für die Vergangenheit weiter.",
            inputSchema: {id: z.uuid().describe("ID des Werts aus list_user_settings")},
            outputSchema: UserSettingsReportSchema,
            annotations: {destructiveHint: true, idempotentHint: false},
        },
        ({id}) =>
            run(async () => {
                await deleteSettingValue(user.id, id);
                const r = await report(user.id);
                return ok(`Gelöscht.\n${r.text}`, r.structured);
            }),
    );
}
