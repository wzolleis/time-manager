// netlify/functions/lib/mcp-tools/overtime-view.ts
// Überstunden für den MCP-Server, gerechnet mit denselben Services wie die UI (Regel 2). Ohne DB, damit testbar.
import {z} from "zod";
import {balanceMinutes, formatOffset, overtimeBalanceMs} from "../../../../shared/overtime-rules";
import {localDay} from "../../../../shared/time-rules";
import {germanDay} from "../../../../shared/vacation-rules";
import type {ReportData} from "./report-view";
import {localIso} from "./view";

export const OvertimeReportSchema = z.object({
    balanceMinutes: z.number().describe("Saldo in Minuten, negativ: Fehlzeit"),
    balance: z.string().describe("Saldo wie in der UI, z. B. +14:30 h"),
    correction: z
        .object({
            offsetMinutes: z.number(),
            offset: z.string(),
            day: z.string().describe("Tag der Korrektur JJJJ-MM-TT, ab dem weitergerechnet wird"),
            created: z.string().describe("Zeitpunkt ISO-8601 mit Offset"),
        })
        .nullable()
        .describe("null: noch keine Korrektur, gerechnet wird ab Beginn der Zeiterfassung"),
});

export type OvertimeRow = {offset: number; created: Date};

export function overtimeReport(data: ReportData, correction: OvertimeRow | null, now: Date) {
    const bookings = data.entries.map((e) => ({id: e.id, type: e.type, bookedAt: e.bookedAt}));
    const ms = overtimeBalanceMs(
        correction,
        bookings,
        data.vacations,
        data.holidays,
        data.sickLeaves,
        localDay(now),
        now,
    );
    const minutes = balanceMinutes(ms);

    const structured: z.infer<typeof OvertimeReportSchema> = {
        balanceMinutes: minutes,
        balance: `${formatOffset(minutes)} h`,
        correction: correction && {
            offsetMinutes: correction.offset,
            offset: `${formatOffset(correction.offset)} h`,
            day: localDay(correction.created),
            created: localIso(correction.created),
        },
    };

    const lines = [`Überstunden: ${structured.balance}`];
    lines.push(
        structured.correction
            ? `Korrektur am ${germanDay(structured.correction.day)}: ${structured.correction.offset}`
            : "Keine Korrektur",
    );
    return {structured, text: lines.join("\n")};
}
