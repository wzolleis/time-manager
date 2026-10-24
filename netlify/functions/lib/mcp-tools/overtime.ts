// netlify/functions/lib/mcp-tools/overtime.ts
// Tools der Überstunden: Saldo abfragen und den Korrekturwert setzen, wie auf der Seite „Überstunden“
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {MAX_OFFSET_HOURS, toOffset} from "../../../../shared/overtime-rules";
import {getOvertime, saveOvertime} from "../overtime-store";
import type {SessionUser} from "../session";
import {loadReportData} from "./data";
import {overtimeReport, OvertimeReportSchema} from "./overtime-view";
import {ok, run} from "./view";

const report = async (userId: string) => {
    const data = await loadReportData(userId);
    return overtimeReport(data, await getOvertime(userId), new Date());
};

export function registerOvertimeTools(server: McpServer, user: SessionUser): void {
    server.registerTool(
        "get_overtime",
        {
            title: "Überstunden",
            description:
                "Saldo der Überstunden (negativ: Fehlzeit) mit Tag und Wert der letzten Korrektur. Gerechnet wird " +
                "ab dem Tag der Korrektur, heute zählt mit dem vollen Soll. Die Differenzen in den Berichten sind " +
                "davon getrennt.",
            outputSchema: OvertimeReportSchema,
            annotations: {readOnlyHint: true},
        },
        () =>
            run(async () => {
                const r = await report(user.id);
                return ok(r.text, r.structured);
            }),
    );

    server.registerTool(
        "set_overtime_offset",
        {
            title: "Überstunden korrigieren",
            description:
                "Setzt den Korrekturwert der Überstunden absolut, z. B. auf den Stand der Zeiterfassung der Firma. " +
                "Der Wert ist der Saldo bis gestern, ab heute wird mit den Buchungen weitergerechnet. Eine " +
                "frühere Korrektur wird überschrieben. Höchstens ±23:59 Stunden.",
            inputSchema: {
                sign: z.enum(["+", "-"]).describe("+ für Überstunden, - für Fehlzeit"),
                hours: z.number().int().min(0).max(MAX_OFFSET_HOURS),
                minutes: z.number().int().min(0).max(59),
            },
            outputSchema: OvertimeReportSchema,
            annotations: {destructiveHint: true, idempotentHint: false},
        },
        ({sign, hours, minutes}) =>
            run(async () => {
                await saveOvertime(user.id, toOffset({sign, hours, minutes}));
                const r = await report(user.id);
                return ok(`Korrektur gespeichert.\n${r.text}`, r.structured);
            }),
    );
}
