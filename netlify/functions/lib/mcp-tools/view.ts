// netlify/functions/lib/mcp-tools/view.ts
// Formate der Tool-Ergebnisse (features/boundaries/mcp-enable.md, „Formate“): Minuten statt Millisekunden,
// Zeitpunkte als ISO mit Offset, Texte wie in der UI und Markdown-Tabellen. Ohne DB, damit testbar.
import type {CallToolResult} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {formatDayShort, formatDuration, formatTime} from "../../../../shared/format";
import {localTimeToUtc} from "../../../../shared/day-range";
import {type Booking, localDay} from "../../../../shared/time-rules";
import {hasDbCode} from "../db-errors";
import {RuleError} from "../rule-error";
import {NotFoundError, type StoredEntry} from "../time-entries-store";
import {SettingNotFoundError} from "../user-settings-store";

const TZ = "Europe/Berlin";

/** Ganze Minuten wie in formatDuration und formatDifference: der Betrag wird abgerundet, das Vorzeichen bleibt */
export const minutes = (ms: number): number => {
    const m = Math.floor(Math.abs(ms) / 60_000);
    return m === 0 ? 0 : Math.sign(ms) * m;
};

const isoFormat = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
}); // ergibt "JJJJ-MM-TT HH:mm:ss"

/** Zeitpunkt als ISO-8601 in Berliner Zeit mit Offset: "2026-10-19T08:00:00+02:00" */
export function localIso(d: Date): string {
    const local = isoFormat.format(d).replace(" ", "T");
    const offset = Math.round((Date.parse(`${local}Z`) - Math.floor(d.getTime() / 1000) * 1000) / 60_000);
    const abs = Math.abs(offset);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${local}${offset < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Tag ("JJJJ-MM-TT") kurz wie in der UI: "Mo., 19.10." */
export const dayShort = (day: string): string => formatDayShort(localTimeToUtc(day, "12:00"));

export const typeLabel = (type: Booking["type"]): string => (type === "kommen" ? "Kommen" : "Gehen");

/** Markdown-Tabelle; ein "|" im Inhalt (z. B. im Projektnamen) wird maskiert */
export function mdTable(head: string[], rows: string[][]): string {
    const line = (cells: string[]) => `| ${cells.map((c) => c.replaceAll("|", "\\|")).join(" | ")} |`;
    return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

export const EntrySchema = z.object({
    id: z.string(),
    type: z.enum(["kommen", "gehen"]),
    day: z.string().describe("Tag JJJJ-MM-TT, Berliner Zeit"),
    time: z.string().describe("Uhrzeit HH:mm, Berliner Zeit"),
    bookedAt: z.string().describe("Zeitpunkt ISO-8601 mit Offset"),
    projectId: z.string().nullable(),
    projectName: z.string().nullable(),
});

export type EntryView = z.infer<typeof EntrySchema>;

export function entryView(e: StoredEntry, projectNames: Map<string, string>): EntryView {
    return {
        id: e.id,
        type: e.type,
        day: localDay(e.bookedAt),
        time: formatTime(e.bookedAt),
        bookedAt: localIso(e.bookedAt),
        projectId: e.projectId,
        projectName: e.projectId ? (projectNames.get(e.projectId) ?? null) : null,
    };
}

/** Eine Buchung in einem Satz: "Kommen am Mo., 19.10. um 08:00 (Alpha)" */
export const entryText = (e: EntryView): string =>
    `${typeLabel(e.type)} am ${dayShort(e.day)} um ${e.time}${e.projectName ? ` (${e.projectName})` : ""}`;

/**
 * Die Buchungen eines ganzen Tages (nach Zeit sortiert, abwechselnd Kommen und Gehen) in einem Satz:
 * "am Mo., 26.10.: 08:00–14:00, 14:30–16:30 (8 Std Arbeit, 30 Min Pause, Alpha)"
 */
export function workDayText(entries: EntryView[]): string {
    const pairs: [EntryView, EntryView][] = [];
    for (let i = 0; i + 1 < entries.length; i += 2) pairs.push([entries[i], entries[i + 1]]);
    const span = (from: EntryView, to: EntryView) => Date.parse(to.bookedAt) - Date.parse(from.bookedAt);
    const work = pairs.reduce((sum, [from, to]) => sum + span(from, to), 0);
    const pause = pairs.slice(1).reduce((sum, [from], i) => sum + span(pairs[i][1], from), 0);
    const details = [
        `${formatDuration(work)} Arbeit`,
        pause > 0 ? `${formatDuration(pause)} Pause` : "ohne Pause",
        entries[0]?.projectName,
    ].filter(Boolean);
    const times = pairs.map(([from, to]) => `${from.time}–${to.time}`).join(", ");
    return `am ${dayShort(entries[0].day)}: ${times} (${details.join(", ")})`;
}

export const NOT_FOUND = "Buchung nicht gefunden";

export const ok = (text: string, structured: Record<string, unknown>): CallToolResult => ({
    content: [{type: "text", text}],
    structuredContent: structured,
});

export const fail = (message: string): CallToolResult => ({content: [{type: "text", text: message}], isError: true});

/**
 * Ein Fehler als Ergebnis mit isError (Regel 4), damit der Agent die Meldung zeigen oder seinen Aufruf
 * korrigieren kann. Unerwartete Fehler werden geloggt und nicht im Wortlaut weitergegeben.
 */
export function errorResult(err: unknown): CallToolResult {
    if (err instanceof RuleError) return fail(err.message);
    if (err instanceof NotFoundError) return fail(NOT_FOUND); // auch eine fremde Buchung (Regel 3)
    if (err instanceof SettingNotFoundError) return fail("Wert nicht gefunden"); // auch ein fremder Wert
    if (hasDbCode(err, "ER_DUP_ENTRY")) return fail("Für diesen Tag gibt es schon einen Wert");
    if (hasDbCode(err, "ER_NO_REFERENCED_ROW_2")) return fail("Projekt existiert nicht");
    console.error(err);
    return fail("Interner Fehler");
}

/** Führt ein Tool aus und wandelt Fehler in ein Ergebnis mit isError */
export async function run(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
    try {
        return await fn();
    } catch (err) {
        return errorResult(err);
    }
}
