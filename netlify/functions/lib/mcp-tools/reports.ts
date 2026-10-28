// netlify/functions/lib/mcp-tools/reports.ts
// Tools der Berichte. Gerechnet wird in report-view.ts mit den Services der UI (Regel 2).
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {localDay} from "../../../../shared/time-rules";
import {isValidYear, monthOf} from "../../../../shared/week";
import type {SessionUser} from "../session";
import {loadReportData} from "./data";
import {
    dailyReport,
    DailyReportSchema,
    monthlyReport,
    MonthlyReportSchema,
    weeklyReport,
    WeeklyReportSchema,
    yearlyReport,
    YearlyReportSchema,
} from "./report-view";
import {DaySchema} from "./time-entries";
import {ok, run} from "./view";

const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Monat als JJJJ-MM");
const YearSchema = z.string().refine(isValidYear, "Jahr als JJJJ, ab 1970");

const SHOW_TABLE = "Zeige dem User die Tabelle aus dem Text so, wie sie ist; rechne nicht selbst nach.";

export function registerReportTools(server: McpServer, user: SessionUser): void {
    server.registerTool(
        "get_daily_report",
        {
            title: "Tagesbericht",
            description:
                "Tagesbericht: Buchungen mit id, Arbeitszeit, Pausen, Soll, Differenz und Art des Tags (Feiertag, " +
                `Urlaub, krank). Buchungen an Krankheitstagen zählen nicht. ${SHOW_TABLE}`,
            inputSchema: {day: DaySchema.optional().describe("Tag JJJJ-MM-TT, Standard heute")},
            outputSchema: DailyReportSchema,
            annotations: {readOnlyHint: true},
        },
        ({day}) =>
            run(async () => {
                const now = new Date();
                const report = dailyReport(await loadReportData(user.id), day ?? localDay(now), now);
                return ok(report.text, report.structured);
            }),
    );

    server.registerTool(
        "get_weekly_report",
        {
            title: "Wochenbericht",
            description:
                "Wochenbericht (Montag bis Sonntag) mit einer Zeile pro Tag, Summen, Soll bis heute und Soll der " +
                `Woche. Die Differenz gilt gegen das Soll bis heute. ${SHOW_TABLE}`,
            inputSchema: {day: DaySchema.optional().describe("irgendein Tag der Woche JJJJ-MM-TT, Standard heute")},
            outputSchema: WeeklyReportSchema,
            annotations: {readOnlyHint: true},
        },
        ({day}) =>
            run(async () => {
                const now = new Date();
                const report = weeklyReport(await loadReportData(user.id), day ?? localDay(now), now);
                return ok(report.text, report.structured);
            }),
    );

    server.registerTool(
        "get_monthly_report",
        {
            title: "Monatsbericht",
            description:
                "Monatsbericht mit einer Zeile pro Kalenderwoche (nur die Tage im Monat), Summen, Soll bis heute " +
                `und Soll des Monats. Die Differenz gilt gegen das Soll bis heute, z. B. für Überstunden. ${SHOW_TABLE}`,
            inputSchema: {month: MonthSchema.optional().describe("Monat JJJJ-MM, Standard aktueller Monat")},
            outputSchema: MonthlyReportSchema,
            annotations: {readOnlyHint: true},
        },
        ({month}) =>
            run(async () => {
                const now = new Date();
                const report = monthlyReport(await loadReportData(user.id), month ?? monthOf(localDay(now)), now);
                return ok(report.text, report.structured);
            }),
    );

    server.registerTool(
        "get_yearly_report",
        {
            title: "Jahresbericht",
            description:
                "Jahresbericht mit einer Zeile pro Monat, Summen, Soll bis heute und Soll des Jahres. Die Differenz " +
                `gilt gegen das Soll bis heute, z. B. für Überstunden. ${SHOW_TABLE}`,
            inputSchema: {year: YearSchema.optional().describe("Jahr JJJJ, Standard aktuelles Jahr")},
            outputSchema: YearlyReportSchema,
            annotations: {readOnlyHint: true},
        },
        ({year}) =>
            run(async () => {
                const now = new Date();
                const report = yearlyReport(await loadReportData(user.id), year ?? localDay(now).slice(0, 4), now);
                return ok(report.text, report.structured);
            }),
    );
}
