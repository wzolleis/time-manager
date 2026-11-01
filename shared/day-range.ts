import {Temporal} from "temporal-polyfill";
import {type Day, DaySchema, type TimeOfDay, toDay} from "./date-schemas";

/** Alle lokalen Tage und Uhrzeiten gelten in dieser Zeitzone */
export const TZ = "Europe/Berlin";

/** Lokale Uhrzeit ("HH:mm") an einem lokalen Tag ("JJJJ-MM-TT") als UTC-Zeitpunkt.
 * An den Tagen der Zeitumstellung gilt "later": Eine Uhrzeit in der Lücke im Frühjahr (02:30) wird zur Uhrzeit
 * danach (03:30 MESZ), eine Uhrzeit in der doppelten Stunde im Herbst ist die zweite, also die in MEZ.
 */
export function localTimeToUtc(day: Day, time: TimeOfDay): Date {
    const zoned = Temporal.PlainDate.from(day)
        .toPlainDateTime(Temporal.PlainTime.from(time))
        .toZonedDateTime(TZ, {disambiguation: "later"});
    return new Date(zoned.epochMilliseconds);
}

/** Beginn eines lokalen Tages als UTC-Zeitpunkt */
export const startOfLocalDay = (day: Day): Date =>
    new Date(Temporal.PlainDate.from(day).toZonedDateTime(TZ).epochMilliseconds);

/** Verschiebt einen Tag ("JJJJ-MM-TT") um ganze Tage */
export const addDays = (day: Day, delta: number): Day =>
    Temporal.PlainDate.from(day).add({days: delta}).toString() as Day;

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
