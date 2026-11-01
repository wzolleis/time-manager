import {Temporal} from "temporal-polyfill";
import {addDays} from "./day-range";
import {type Day, type Month, MonthSchema, type Year, YearSchema} from "./date-schemas";

/** Wochentag eines Tages ("JJJJ-MM-TT"): 0 = Montag ... 6 = Sonntag */
export const weekdayIndex = (day: Day): number => Temporal.PlainDate.from(day).dayOfWeek - 1; // Temporal: 1 = Montag

/** Samstag oder Sonntag */
export const isWeekend = (day: Day): boolean => weekdayIndex(day) >= 5;

/** Montag der Woche, in der der Tag liegt */
export const startOfWeek = (day: Day): Day => addDays(day, -weekdayIndex(day));

/** Die sieben Tage der Woche, Montag bis Sonntag */
export const weekDays = (day: Day): Day[] => {
    const monday = startOfWeek(day);
    return Array.from({length: 7}, (_, i) => addDays(monday, i));
};

/** Kalenderwoche nach ISO 8601 (Woche mit dem ersten Donnerstag des Jahres ist KW 1) */
export function isoWeek(day: Day): {year: number; week: number} {
    const date = Temporal.PlainDate.from(day);
    // Im ISO-Kalender, den PlainDate.from verwendet, gibt es Woche und Wochenjahr immer
    return {year: date.yearOfWeek!, week: date.weekOfYear!};
}

/** Die ISO-Woche eines Tages ("JJJJ-MM-TT") als "JJJJ-Www", z. B. "2026-W43". Das Jahr ist das ISO-Wochenjahr. */
export function isoWeekId(day: Day): string {
    const {year, week} = isoWeek(day);
    return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Der Montag einer ISO-Woche "JJJJ-Www", bei ungültiger Angabe (z. B. "2026-W54", "2026-43") null */
export function parseIsoWeek(id: string): Day | null {
    const match = /^(\d{4})-W(\d{2})$/.exec(id);
    if (!match) return null;
    const [, year, week] = match;
    // Der 4. Januar liegt immer in KW 1, von dessen Montag aus wird gezählt
    const monday = addDays(startOfWeek(`${year}-01-04` as Day), (Number(week) - 1) * 7);
    return isoWeekId(monday) === id ? monday : null;
}

/** Monat eines Tages ("JJJJ-MM-TT") als "JJJJ-MM" */
export const monthOf = (day: Day): Month => day.slice(0, 7) as Month;

/** Jahr eines Tages ("JJJJ-MM-TT") oder Monats ("JJJJ-MM") als "JJJJ" */
export const yearOf = (day: Day | Month): Year => day.slice(0, 4) as Year;

/** Der 1. Januar eines Jahres */
export const firstDayOfYear = (year: number | Year): Day => `${year}-01-01` as Day;

/** Der 31. Dezember eines Jahres */
export const lastDayOfYear = (year: number | Year): Day => `${year}-12-31` as Day;

/** Verschiebt einen Monat ("JJJJ-MM") um ganze Monate */
export const addMonths = (month: Month, delta: number): Month =>
    Temporal.PlainYearMonth.from(month).add({months: delta}).toString() as Month;

/** Monat als "JJJJ-MM" mit Monat 01 bis 12 */
export const isValidMonth = (month: string): month is Month => MonthSchema.safeParse(month).success;

/** Jahr als vierstelliger Text "JJJJ", ab 1970 */
export const isValidYear = (year: string): year is Year => YearSchema.safeParse(year).success;

/** Die Monate eines Jahres ("JJJJ") als "JJJJ-MM", Januar bis Dezember */
export const yearMonths = (year: Year): Month[] =>
    Array.from({length: 12}, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}` as Month);

export type MonthWeek = {year: number; week: number; days: Day[]};

/** Die Kalenderwochen eines Monats ("JJJJ-MM"), jede nur mit ihren Tagen in diesem Monat */
export function monthWeeks(month: Month): MonthWeek[] {
    const weeks: MonthWeek[] = [];
    for (let day = `${month}-01` as Day; monthOf(day) === month; day = addDays(day, 1)) {
        const current = weeks.at(-1);
        if (current && weekdayIndex(day) !== 0) current.days.push(day);
        else weeks.push({...isoWeek(day), days: [day]}); // Monatsanfang oder Montag
    }
    return weeks;
}
