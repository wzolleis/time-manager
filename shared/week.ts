import {addDays} from "./day-range";

/** Wochentag eines Tages ("JJJJ-MM-TT"): 0 = Montag ... 6 = Sonntag */
export function weekdayIndex(day: string): number {
    const [y, m, d] = day.split("-").map(Number);
    return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Samstag oder Sonntag */
export const isWeekend = (day: string): boolean => weekdayIndex(day) >= 5;

/** Montag der Woche, in der der Tag liegt */
export const startOfWeek = (day: string): string => addDays(day, -weekdayIndex(day));

/** Die sieben Tage der Woche, Montag bis Sonntag */
export const weekDays = (day: string): string[] => {
    const monday = startOfWeek(day);
    return Array.from({length: 7}, (_, i) => addDays(monday, i));
};

/** Kalenderwoche nach ISO 8601 (Woche mit dem ersten Donnerstag des Jahres ist KW 1) */
export function isoWeek(day: string): { year: number; week: number } {
    const [y, m, d] = day.split("-").map(Number);
    const thursday = new Date(Date.UTC(y, m - 1, d));
    thursday.setUTCDate(thursday.getUTCDate() - weekdayIndex(day) + 3); // Donnerstag dieser Woche

    const year = thursday.getUTCFullYear();
    const jan4 = new Date(Date.UTC(year, 0, 4)); // der 4. Januar liegt immer in KW 1
    const firstThursday = new Date(jan4);
    firstThursday.setUTCDate(jan4.getUTCDate() - weekdayIndex(jan4.toISOString().slice(0, 10)) + 3);

    const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
    return {year, week};
}

