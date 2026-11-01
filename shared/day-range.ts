import {type Day, DaySchema, type TimeOfDay, toDay} from "./date-schemas";

/** Alle lokalen Tage und Uhrzeiten gelten in dieser Zeitzone */
export const TZ = "Europe/Berlin";

const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});

/** Abstand von Berlin zu UTC (in ms) zu einem Zeitpunkt: +1 h Winter, +2 h Sommer */
function offsetMs(at: Date): number {
    const parts = formatter.formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return localAsUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Lokale Uhrzeit ("HH:mm") an einem lokalen Tag ("JJJJ-MM-TT") als UTC-Zeitpunkt */
export function localTimeToUtc(day: Day, time: TimeOfDay): Date {
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    // Zweiter Durchgang: Am Umstellungstag unterscheidet sich der Abstand
    // vor und nach dem Schätzwert
    const first = guess - offsetMs(new Date(guess));
    return new Date(guess - offsetMs(new Date(first)));
}

/** Mitternacht eines lokalen Tages als UTC-Zeitpunkt */
export const startOfLocalDay = (day: Day): Date => localTimeToUtc(day, "00:00" as TimeOfDay);

/** Verschiebt einen Tag ("JJJJ-MM-TT") um ganze Tage */
export function addDays(day: Day, delta: number): Day {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10) as Day;
}

/** [start, end): end ist der Beginn des Folgetags und gehört nicht mehr dazu */
export function localDayRange(day: Day): {start: Date; end: Date} {
    return {start: startOfLocalDay(day), end: startOfLocalDay(addDays(day, 1))};
}

/** "JJJJ-MM-TT", ein echtes Kalenderdatum ab 1970 (2026-02-30 ist ungültig), geprüft mit DaySchema */
export const isValidDay = (day: string): day is Day => DaySchema.safeParse(day).success;

/** Ein Zeitraum ganzer Tage ("JJJJ-MM-TT"), das Ende ist eingeschlossen */
export type DayRange = {startDate: Day; endDate: Day};

/** Beginn und Ende aus einem Formular als Zeitraum, null, wenn einer der beiden Tage ungültig ist */
export function toDayRange(input: {startDate: string; endDate: string}): DayRange | null {
    const startDate = toDay(input.startDate);
    const endDate = toDay(input.endDate);
    return startDate && endDate ? {startDate, endDate} : null;
}

/** Liegt der Tag ("JJJJ-MM-TT") in einem der Zeiträume? Beginn und Ende zählen mit. */
export const isInRanges = (day: Day, ranges: DayRange[]): boolean =>
    ranges.some((r) => r.startDate <= day && day <= r.endDate);
