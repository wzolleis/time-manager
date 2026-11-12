import type {Day, Month, Year} from "./date-schemas";
import {type DayRange, localDayRange} from "./day-range";
import {type HolidayRange, holidayOn} from "./holiday-rules";
import {withoutSickDays} from "./sick-leave-rules";
import {dayKind, type DayKind, targetMs} from "./target-hours";
import {type Booking, buildPeriods, firstBookingDay, type Period} from "./time-rules";
import type {SettingHistory} from "./user-setting-rules";
import {monthWeeks, yearMonths} from "./week";

export type DayTotals = {
    workMs: number;
    breakMs: number;
    running: boolean; // heute läuft ein Zeitraum
    missingGehen: boolean; // an diesem vergangenen Tag fehlt das gehen
};

export type CountedPeriods = {work: Period[]; breaks: Period[]};

/**
 * Arbeitszeiten und Pausen aller Buchungen ohne die an Krankheitstagen. Einmal aufbauen und für jeden Tag mit
 * periodTotals auswerten: pro Tag neu aufgebaut wächst die Rechenzeit mit Tagen × Buchungen.
 */
export const countedPeriods = (entries: Booking[], sickLeaves: DayRange[]): CountedPeriods =>
    // Ein Buchungspaar liegt immer an einem Tag, die Abfolge bleibt ohne die Krankheitstage gültig
    buildPeriods(withoutSickDays(entries, sickLeaves));

/** Summen eines Tages. Buchungen an Krankheitstagen zählen nicht, auch keine laufende Arbeitszeit. */
export const dayTotals = (
    entries: Booking[],
    range: {start: Date; end: Date},
    sickLeaves: DayRange[],
    now: Date,
): DayTotals => periodTotals(countedPeriods(entries, sickLeaves), range, now);

/** Summen eines Tages aus den Zeiträumen von countedPeriods */
export function periodTotals({work, breaks}: CountedPeriods, range: {start: Date; end: Date}, now: Date): DayTotals {
    const start = range.start.getTime();
    const end = range.end.getTime();
    const nowMs = now.getTime();

    let workMs = 0;
    let running = false;
    let missingGehen = false;

    for (const p of work) {
        if (p.to) {
            // Abgeschlossene Zeiträume werden am Tag beschnitten (Altdaten über Mitternacht stimmen so weiter)
            const from = Math.max(p.from.getTime(), start);
            const to = Math.min(p.to.getTime(), end);
            if (to > from) workMs += to - from;
        } else if (p.from.getTime() >= start && p.from.getTime() < end) {
            if (nowMs >= end) {
                missingGehen = true; // der Tag ist vorbei, das gehen fehlt
            } else if (nowMs >= p.from.getTime()) {
                workMs += nowMs - p.from.getTime();
                running = true;
            }
        }
    }

    // Pausen liegen per Definition an einem Tag, eine Beschneidung ist nicht nötig
    const breakMs = breaks
        .filter((b) => b.from.getTime() >= start && b.from.getTime() < end)
        .reduce((sum, b) => sum + (b.to!.getTime() - b.from.getTime()), 0);

    // Ein Tag zählt nur ganze Minuten: Arbeitszeit, Differenz, Summen und Saldo passen so zur Anzeige
    return {workMs: wholeMinutesMs(workMs), breakMs, running, missingGehen};
}

const MINUTE_MS = 60_000;

/** Auf ganze Minuten abgerundet: 7:57:18 → 7:57:00 */
export const wholeMinutesMs = (ms: number): number => Math.floor(ms / MINUTE_MS) * MINUTE_MS;

/**
 * Differenz eines Tages ("JJJJ-MM-TT") gegen das Soll. null: der Tag liegt nach heute, oder er hat weder
 * Soll noch Arbeitszeit (freier Tag ohne Arbeit). today ist der heutige Tag "JJJJ-MM-TT".
 */
export const dayDiffMs = (day: Day, today: Day, workMs: number, target: number): number | null =>
    day > today || (target === 0 && workMs === 0) ? null : workMs - target; // ISO-Daten lassen sich als Text vergleichen

export type WeekDayTotals = DayTotals & {
    day: Day; // "JJJJ-MM-TT"
    count: number; // Buchungen an diesem Tag, auch die an Krankheitstagen
    targetMs: number;
    kind: DayKind;
    holidayName?: string;
    diffMs: number | null; // null: Zukunft oder freier Tag ohne Arbeit
};

export type WeekTotals = {
    days: WeekDayTotals[];
    workMs: number;
    breakMs: number;
    targetWeekMs: number; // ohne Urlaubs-, Krankheits- und Feiertage
    targetToDateMs: number; // Soll der Tage bis heute
    diffMs: number; // gegen das Soll bis heute, damit die Differenz mitten in der Woche aussagekräftig ist
};

/**
 * Summen je Tag und für die ganze Woche. today ist der heutige Tag "JJJJ-MM-TT". periods übergeben Monat und
 * Jahr, damit die Zeiträume nur einmal aufgebaut werden.
 */
export function weekTotals(
    entries: Booking[],
    days: Day[],
    vacations: DayRange[],
    holidays: Pick<HolidayRange, "date" | "name">[],
    sickLeaves: DayRange[],
    soll: SettingHistory,
    today: Day,
    now: Date,
    // Alle Buchungen gehen in die Summen ein, damit Nachtschichten am Tageswechsel stimmen
    periods: CountedPeriods = countedPeriods(entries, sickLeaves),
): WeekTotals {
    const trackingStart = firstBookingDay(entries); // mit allen Buchungen, auch denen an Krankheitstagen
    const rows: WeekDayTotals[] = days.map((day) => {
        const range = localDayRange(day);
        const totals = periodTotals(periods, range, now);
        const target = targetMs(day, vacations, holidays, sickLeaves, trackingStart, soll);

        return {
            ...totals,
            day,
            count: entries.filter((e) => e.bookedAt >= range.start && e.bookedAt < range.end).length,
            targetMs: target,
            kind: dayKind(day, vacations, holidays, sickLeaves, trackingStart),
            holidayName: holidayOn(day, holidays)?.name,
            diffMs: dayDiffMs(day, today, totals.workMs, target),
        };
    });

    const sum = (list: WeekDayTotals[], pick: (r: WeekDayTotals) => number) =>
        list.reduce((acc, r) => acc + pick(r), 0);
    const workMs = sum(rows, (r) => r.workMs);
    const targetToDateMs = sum(
        rows.filter((r) => r.day <= today),
        (r) => r.targetMs,
    );

    return {
        days: rows,
        workMs,
        breakMs: sum(rows, (r) => r.breakMs),
        targetWeekMs: sum(rows, (r) => r.targetMs),
        targetToDateMs,
        diffMs: workMs - targetToDateMs,
    };
}

export type MonthWeekTotals = {
    year: number; // Jahr der ISO-Kalenderwoche
    week: number;
    days: Day[]; // nur die Tage dieser Woche im Monat
    targetMs: number;
    workMs: number;
    running: boolean;
    diffMs: number | null; // null: alle Tage in der Zukunft, oder bis heute weder Soll noch Arbeit
};

export type MonthTotals = {
    weeks: MonthWeekTotals[];
    workMs: number;
    targetMonthMs: number; // ohne Urlaubs-, Krankheits- und Feiertage
    targetToDateMs: number; // Soll der Tage bis heute
    diffMs: number; // gegen das Soll bis heute
    running: boolean;
};

/**
 * Summen je Kalenderwoche und für den Monat ("JJJJ-MM"). Von Wochen am Monatsrand zählen nur die Tage
 * im Monat, künftige Tage zählen nicht zur Differenz. today ist der heutige Tag "JJJJ-MM-TT".
 */
export function monthTotals(
    entries: Booking[],
    month: Month,
    vacations: DayRange[],
    holidays: Pick<HolidayRange, "date" | "name">[],
    sickLeaves: DayRange[],
    soll: SettingHistory,
    today: Day,
    now: Date,
    periods: CountedPeriods = countedPeriods(entries, sickLeaves),
): MonthTotals {
    const parts = monthWeeks(month).map(({year, week, days}) => {
        const t = weekTotals(entries, days, vacations, holidays, sickLeaves, soll, today, now, periods);
        const row: MonthWeekTotals = {
            year,
            week,
            days,
            targetMs: t.targetWeekMs,
            workMs: t.workMs,
            running: t.days.some((d) => d.running),
            diffMs: days[0] > today || (t.targetToDateMs === 0 && t.workMs === 0) ? null : t.diffMs,
        };
        return {row, targetToDateMs: t.targetToDateMs};
    });

    const weeks = parts.map((p) => p.row);
    const workMs = weeks.reduce((sum, w) => sum + w.workMs, 0);
    const targetToDateMs = parts.reduce((sum, p) => sum + p.targetToDateMs, 0);

    return {
        weeks,
        workMs,
        targetMonthMs: weeks.reduce((sum, w) => sum + w.targetMs, 0),
        targetToDateMs,
        diffMs: workMs - targetToDateMs,
        running: weeks.some((w) => w.running),
    };
}

export type YearMonthTotals = {
    month: Month; // "JJJJ-MM"
    targetMs: number;
    workMs: number;
    running: boolean;
    diffMs: number | null; // null: ganzer Monat in der Zukunft, oder bis heute weder Soll noch Arbeit
};

export type YearTotals = {
    months: YearMonthTotals[];
    workMs: number;
    targetYearMs: number; // ohne Urlaubs-, Krankheits- und Feiertage
    targetToDateMs: number; // Soll der Tage bis heute
    diffMs: number; // gegen das Soll bis heute
    running: boolean;
};

/**
 * Summen je Monat und für das Jahr ("JJJJ"). Jeder Monat zählt genau wie im Monatsbericht, das Jahr
 * addiert nur. today ist der heutige Tag "JJJJ-MM-TT".
 */
export function yearTotals(
    entries: Booking[],
    year: Year,
    vacations: DayRange[],
    holidays: Pick<HolidayRange, "date" | "name">[],
    sickLeaves: DayRange[],
    soll: SettingHistory,
    today: Day,
    now: Date,
): YearTotals {
    const periods = countedPeriods(entries, sickLeaves);
    const parts = yearMonths(year).map((month) => {
        const t = monthTotals(entries, month, vacations, holidays, sickLeaves, soll, today, now, periods);
        const row: YearMonthTotals = {
            month,
            targetMs: t.targetMonthMs,
            workMs: t.workMs,
            running: t.running,
            diffMs: `${month}-01` > today || (t.targetToDateMs === 0 && t.workMs === 0) ? null : t.diffMs,
        };
        return {row, targetToDateMs: t.targetToDateMs};
    });

    const months = parts.map((p) => p.row);
    const workMs = months.reduce((sum, m) => sum + m.workMs, 0);
    const targetToDateMs = parts.reduce((sum, p) => sum + p.targetToDateMs, 0);

    return {
        months,
        workMs,
        targetYearMs: months.reduce((sum, m) => sum + m.targetMs, 0),
        targetToDateMs,
        diffMs: workMs - targetToDateMs,
        running: months.some((m) => m.running),
    };
}
