// netlify/functions/lib/mcp-tools/report-view.ts
// Tages-, Wochen-, Monats- und Jahresbericht für den MCP-Server, gerechnet mit denselben Services wie die UI (Regel 2).
// Ohne DB: die Daten kommen als Parameter, damit sich die Berichte testen lassen.
import {z} from "zod";
import {
    dayKindLabel,
    formatDate,
    formatDayMonth,
    formatDifference,
    formatDuration,
    formatMonth,
    formatMonthName,
} from "../../../../shared/format";
import {type DayRange, localDayRange} from "../../../../shared/day-range";
import {holidayOn} from "../../../../shared/holiday-rules";
import {isSickDay} from "../../../../shared/sick-leave-rules";
import {dayKind, targetMs} from "../../../../shared/target-hours";
import {
    dayDiffMs,
    dayTotals,
    monthTotals,
    type WeekDayTotals,
    weekTotals,
    yearTotals,
} from "../../../../shared/time-report";
import {firstBookingDay, localDay} from "../../../../shared/time-rules";
import type {SettingHistory} from "../../../../shared/user-setting-rules";
import {isoWeek, weekDays} from "../../../../shared/week";
import type {StoredEntry} from "../time-entries-store";
import {dayShort, EntrySchema, entryView, mdTable, minutes, typeLabel} from "./view";

export type ReportData = {
    entries: StoredEntry[]; // alle Buchungen des Users, wie sie die UI lädt
    projects: {id: string; name: string}[];
    vacations: DayRange[];
    holidays: {date: string; name: string}[]; // globale und eigene
    sickLeaves: DayRange[];
    soll: SettingHistory; // Soll aus den Einstellungen des Users
};

const dash = "–";
const KINDS = ["workday", "weekend", "untracked", "holiday", "sick", "vacation"] as const;

const toBookings = (entries: StoredEntry[]) => entries.map((e) => ({id: e.id, type: e.type, bookedAt: e.bookedAt}));

const projectNames = (data: ReportData) => new Map(data.projects.map((p) => [p.id, p.name]));

// Text zu einer Dauer, "–" wenn sie 0 ist, wie in den Tabellen der UI
const durationOrDash = (ms: number) => (ms > 0 ? formatDuration(ms) : dash);

const diffText = (ms: number | null) => (ms === null ? null : formatDifference(ms));
const diffMinutes = (ms: number | null) => (ms === null ? null : minutes(ms));

// --- Tagesbericht ----------------------------------------------------------

export const DailyReportSchema = z.object({
    day: z.string(),
    date: z.string().describe("Tag ausgeschrieben wie in der UI"),
    kind: z.enum(KINDS),
    kindText: z.string().nullable().describe("warum der Tag kein Arbeitstag ist, z. B. Feiertag, Urlaub, krank"),
    entries: z.array(EntrySchema.extend({ignored: z.boolean().describe("am Krankheitstag, zählt nicht")})),
    workMinutes: z.number(),
    work: z.string(),
    breakMinutes: z.number(),
    break: z.string(),
    targetMinutes: z.number(),
    target: z.string(),
    diffMinutes: z.number().nullable().describe("null: Tag in der Zukunft oder freier Tag ohne Arbeit"),
    diff: z.string().nullable(),
    running: z.boolean().describe("die Arbeitszeit läuft gerade"),
    missingGehen: z.boolean().describe("an diesem vergangenen Tag fehlt das Gehen"),
});

export function dailyReport(data: ReportData, day: string, now: Date) {
    const today = localDay(now);
    const range = localDayRange(day);
    const bookings = toBookings(data.entries);
    const trackingStart = firstBookingDay(bookings); // mit allen Buchungen, auch denen an Krankheitstagen
    const totals = dayTotals(bookings, range, data.sickLeaves, now);
    const target = targetMs(day, data.vacations, data.holidays, data.sickLeaves, trackingStart, data.soll);
    const kind = dayKind(day, data.vacations, data.holidays, data.sickLeaves, trackingStart);
    const kindText = dayKindLabel(kind, holidayOn(day, data.holidays)?.name) ?? null;
    const diff = dayDiffMs(day, today, totals.workMs, target);
    const names = projectNames(data);

    const entries = data.entries
        .filter((e) => e.bookedAt >= range.start && e.bookedAt < range.end)
        .map((e) => ({...entryView(e, names), ignored: isSickDay(localDay(e.bookedAt), data.sickLeaves)}));

    const structured: z.infer<typeof DailyReportSchema> = {
        day,
        date: formatDate(range.start),
        kind,
        kindText,
        entries,
        workMinutes: minutes(totals.workMs),
        work: formatDuration(totals.workMs),
        breakMinutes: minutes(totals.breakMs),
        break: formatDuration(totals.breakMs),
        targetMinutes: minutes(target),
        target: formatDuration(target),
        diffMinutes: diffMinutes(diff),
        diff: diffText(diff),
        running: totals.running,
        missingGehen: totals.missingGehen,
    };

    const table = entries.length
        ? mdTable(
              ["Uhrzeit", "Buchung", "Projekt", "ID"],
              entries.map((e) => [
                  `${e.time} Uhr`,
                  e.ignored ? `${typeLabel(e.type)} · zählt nicht (krank)` : typeLabel(e.type),
                  e.projectName ?? dash,
                  e.id,
              ]),
          )
        : "Keine Buchungen.";
    const lines = [
        `## ${structured.date}${kindText ? ` · ${kindText}` : ""}`,
        "",
        table,
        "",
        `Arbeit ${structured.work}${totals.running ? ", läuft" : ""} · Pause ${structured.break} · ` +
            `Soll ${structured.target} · Differenz ${structured.diff ?? dash}`,
    ];
    if (totals.missingGehen) lines.push("", "An diesem Tag fehlt das Gehen.");
    return {structured, text: lines.join("\n")};
}

// --- Wochenbericht ---------------------------------------------------------

const WeekDaySchema = z.object({
    day: z.string(),
    kind: z.enum(KINDS),
    kindText: z.string().nullable(),
    count: z.number().describe("Buchungen an diesem Tag"),
    workMinutes: z.number(),
    work: z.string(),
    breakMinutes: z.number(),
    break: z.string(),
    targetMinutes: z.number(),
    target: z.string(),
    diffMinutes: z.number().nullable().describe("null: Tag in der Zukunft oder freier Tag ohne Arbeit"),
    diff: z.string().nullable(),
    running: z.boolean(),
    missingGehen: z.boolean(),
});

export const WeeklyReportSchema = z.object({
    year: z.number(),
    week: z.number(),
    from: z.string(),
    to: z.string(),
    days: z.array(WeekDaySchema),
    workMinutes: z.number(),
    work: z.string(),
    breakMinutes: z.number(),
    break: z.string(),
    targetToDateMinutes: z.number().describe("Soll der Tage bis heute"),
    targetToDate: z.string(),
    targetWeekMinutes: z.number(),
    targetWeek: z.string(),
    diffMinutes: z.number().nullable().describe("gegen das Soll bis heute; null bei einer künftigen Woche"),
    diff: z.string().nullable(),
});

const weekDayView = (d: WeekDayTotals): z.infer<typeof WeekDaySchema> => ({
    day: d.day,
    kind: d.kind,
    kindText: dayKindLabel(d.kind, d.holidayName) ?? null,
    count: d.count,
    workMinutes: minutes(d.workMs),
    work: formatDuration(d.workMs),
    breakMinutes: minutes(d.breakMs),
    break: formatDuration(d.breakMs),
    targetMinutes: minutes(d.targetMs),
    target: formatDuration(d.targetMs),
    diffMinutes: diffMinutes(d.diffMs),
    diff: diffText(d.diffMs),
    running: d.running,
    missingGehen: d.missingGehen,
});

// Hinweise in der Spalte Tag: Urlaub, Feiertag und Krankheit wie in der UI, Wochenende ergibt sich aus dem Tag
const dayCell = (d: WeekDayTotals) => {
    const notes = [];
    if (d.kind === "vacation" || d.kind === "holiday" || d.kind === "sick")
        notes.push(dayKindLabel(d.kind, d.holidayName));
    if (d.missingGehen) notes.push("Gehen fehlt");
    return [dayShort(d.day), ...notes].join(" · ");
};

// "Bis heute 19 Std 55 Min von 24 Std Soll, −4 Std 5 Min. Soll der Woche 40 Std."
function summaryLine(
    t: {workMs: number; targetToDateMs: number; targetMs: number; diffMs: number},
    future: boolean,
    of: string,
) {
    const total = `Soll ${of} ${formatDuration(t.targetMs)}.`;
    if (future) return total;
    const partial = t.targetToDateMs !== t.targetMs;
    const work = `${formatDuration(t.workMs)} von ${formatDuration(t.targetToDateMs)} Soll, ${formatDifference(t.diffMs)}.`;
    return partial ? `Bis heute ${work} ${total}` : `Gearbeitet ${work}`;
}

export function weeklyReport(data: ReportData, day: string, now: Date) {
    const today = localDay(now);
    const days = weekDays(day);
    const {year, week} = isoWeek(day);
    const t = weekTotals(
        toBookings(data.entries),
        days,
        data.vacations,
        data.holidays,
        data.sickLeaves,
        data.soll,
        today,
        now,
    );
    const future = days[0] > today;

    const structured: z.infer<typeof WeeklyReportSchema> = {
        year,
        week,
        from: days[0],
        to: days[6],
        days: t.days.map(weekDayView),
        workMinutes: minutes(t.workMs),
        work: formatDuration(t.workMs),
        breakMinutes: minutes(t.breakMs),
        break: formatDuration(t.breakMs),
        targetToDateMinutes: minutes(t.targetToDateMs),
        targetToDate: formatDuration(t.targetToDateMs),
        targetWeekMinutes: minutes(t.targetWeekMs),
        targetWeek: formatDuration(t.targetWeekMs),
        diffMinutes: future ? null : minutes(t.diffMs),
        diff: future ? null : formatDifference(t.diffMs),
    };

    const table = mdTable(
        ["Tag", "Arbeit", "Pause", "Soll", "Differenz"],
        t.days.map((d) => [
            dayCell(d),
            d.running ? `${formatDuration(d.workMs)}, läuft` : durationOrDash(d.workMs),
            durationOrDash(d.breakMs),
            durationOrDash(d.targetMs),
            d.diffMs === null ? dash : formatDifference(d.diffMs),
        ]),
    );
    const heading = `## KW ${week}, ${formatDayMonth(localDayRange(days[0]).start)}–${formatDayMonth(localDayRange(days[6]).start)}${days[6].slice(0, 4)}`;
    const summary = summaryLine({...t, targetMs: t.targetWeekMs}, future, "der Woche");
    return {structured, text: [heading, "", table, "", summary].join("\n")};
}

// --- Monatsbericht ---------------------------------------------------------

export const MonthlyReportSchema = z.object({
    month: z.string().describe("JJJJ-MM"),
    monthText: z.string(),
    weeks: z.array(
        z.object({
            year: z.number(),
            week: z.number(),
            from: z.string().describe("erster Tag der Woche in diesem Monat"),
            to: z.string().describe("letzter Tag der Woche in diesem Monat"),
            workMinutes: z.number(),
            work: z.string(),
            targetMinutes: z.number(),
            target: z.string(),
            diffMinutes: z.number().nullable().describe("null: Woche in der Zukunft oder ohne Soll und Arbeit"),
            diff: z.string().nullable(),
            running: z.boolean(),
        }),
    ),
    workMinutes: z.number(),
    work: z.string(),
    targetToDateMinutes: z.number().describe("Soll der Tage bis heute"),
    targetToDate: z.string(),
    targetMonthMinutes: z.number(),
    targetMonth: z.string(),
    diffMinutes: z.number().nullable().describe("gegen das Soll bis heute; null bei einem künftigen Monat"),
    diff: z.string().nullable(),
    running: z.boolean(),
});

export function monthlyReport(data: ReportData, month: string, now: Date) {
    const today = localDay(now);
    const t = monthTotals(
        toBookings(data.entries),
        month,
        data.vacations,
        data.holidays,
        data.sickLeaves,
        data.soll,
        today,
        now,
    );
    const future = `${month}-01` > today;
    const dayLabel = (day: string) => formatDayMonth(localDayRange(day).start);

    const weeks = t.weeks.map((w) => ({
        year: w.year,
        week: w.week,
        from: w.days[0],
        to: w.days[w.days.length - 1],
        workMinutes: minutes(w.workMs),
        work: formatDuration(w.workMs),
        targetMinutes: minutes(w.targetMs),
        target: formatDuration(w.targetMs),
        diffMinutes: diffMinutes(w.diffMs),
        diff: diffText(w.diffMs),
        running: w.running,
    }));

    const structured: z.infer<typeof MonthlyReportSchema> = {
        month,
        monthText: formatMonth(month),
        weeks,
        workMinutes: minutes(t.workMs),
        work: formatDuration(t.workMs),
        targetToDateMinutes: minutes(t.targetToDateMs),
        targetToDate: formatDuration(t.targetToDateMs),
        targetMonthMinutes: minutes(t.targetMonthMs),
        targetMonth: formatDuration(t.targetMonthMs),
        diffMinutes: future ? null : minutes(t.diffMs),
        diff: future ? null : formatDifference(t.diffMs),
        running: t.running,
    };

    const table = mdTable(
        ["Woche", "Arbeit", "Soll", "Differenz"],
        t.weeks.map((w) => [
            `KW ${w.week} (${dayLabel(w.days[0])}–${dayLabel(w.days[w.days.length - 1])})`,
            w.running ? `${formatDuration(w.workMs)}, läuft` : durationOrDash(w.workMs),
            durationOrDash(w.targetMs),
            w.diffMs === null ? dash : formatDifference(w.diffMs),
        ]),
    );
    const summary = summaryLine({...t, targetMs: t.targetMonthMs}, future, "des Monats");
    return {structured, text: [`## ${structured.monthText}`, "", table, "", summary].join("\n")};
}

// --- Jahresbericht ---------------------------------------------------------

export const YearlyReportSchema = z.object({
    year: z.string().describe("JJJJ"),
    months: z.array(
        z.object({
            month: z.string().describe("JJJJ-MM"),
            monthText: z.string(),
            workMinutes: z.number(),
            work: z.string(),
            targetMinutes: z.number(),
            target: z.string(),
            diffMinutes: z.number().nullable().describe("null: Monat in der Zukunft oder ohne Soll und Arbeit"),
            diff: z.string().nullable(),
            running: z.boolean(),
        }),
    ),
    workMinutes: z.number(),
    work: z.string(),
    targetToDateMinutes: z.number().describe("Soll der Tage bis heute"),
    targetToDate: z.string(),
    targetYearMinutes: z.number(),
    targetYear: z.string(),
    diffMinutes: z.number().nullable().describe("gegen das Soll bis heute; null bei einem künftigen Jahr"),
    diff: z.string().nullable(),
    running: z.boolean(),
});

export function yearlyReport(data: ReportData, year: string, now: Date) {
    const today = localDay(now);
    const bookings = toBookings(data.entries);
    const t = yearTotals(bookings, year, data.vacations, data.holidays, data.sickLeaves, data.soll, today, now);
    const future = `${year}-01-01` > today;
    const firstYear = firstBookingDay(bookings)?.slice(0, 4);

    const months = t.months.map((m) => ({
        month: m.month,
        monthText: formatMonthName(m.month),
        workMinutes: minutes(m.workMs),
        work: formatDuration(m.workMs),
        targetMinutes: minutes(m.targetMs),
        target: formatDuration(m.targetMs),
        diffMinutes: diffMinutes(m.diffMs),
        diff: diffText(m.diffMs),
        running: m.running,
    }));

    const structured: z.infer<typeof YearlyReportSchema> = {
        year,
        months,
        workMinutes: minutes(t.workMs),
        work: formatDuration(t.workMs),
        targetToDateMinutes: minutes(t.targetToDateMs),
        targetToDate: formatDuration(t.targetToDateMs),
        targetYearMinutes: minutes(t.targetYearMs),
        targetYear: formatDuration(t.targetYearMs),
        diffMinutes: future ? null : minutes(t.diffMs),
        diff: future ? null : formatDifference(t.diffMs),
        running: t.running,
    };

    const table = mdTable(
        ["Monat", "Arbeit", "Soll", "Differenz"],
        t.months.map((m, i) => [
            months[i].monthText,
            m.running ? `${formatDuration(m.workMs)}, läuft` : durationOrDash(m.workMs),
            durationOrDash(m.targetMs),
            m.diffMs === null ? dash : formatDifference(m.diffMs),
        ]),
    );
    const summary = [summaryLine({...t, targetMs: t.targetYearMs}, future, "des Jahres")];
    // Regel 4: vor der ersten Buchung erklärt der Agent dem User, warum alles leer ist
    if (firstYear && year < firstYear) summary.push(`Die Zeiterfassung beginnt ${firstYear}.`);
    return {structured, text: [`## ${year}`, "", table, "", summary.join(" ")].join("\n")};
}
