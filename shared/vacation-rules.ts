import {addDays} from "./day-range";
import {weekdayIndex} from "./week";

export type VacationRange = { id: string; startDate: string; endDate: string };

export const MAX_VACATION_DAYS = 366;

const DAY_MS = 86_400_000;
const utc = (day: string): number => {
    const [y, m, d] = day.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
};

/** "JJJJ-MM-TT" und ein echtes Kalenderdatum (2026-02-30 ist ungültig) */
export function isValidDay(day: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const [y, m, d] = day.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Kalendertage inklusive Beginn und Ende */
export const dayCount = (start: string, end: string): number =>
    Math.round((utc(end) - utc(start)) / DAY_MS) + 1;

/** Deutsches Datum: "2026-06-08" wird zu "08.06.2026" */
export const germanDay = (day: string): string => day.split("-").reverse().join(".");

/** null = gültig, sonst eine verständliche Fehlermeldung */
export function checkRange(start: string, end: string): string | null {
    if (!isValidDay(start) || !isValidDay(end)) return "Ungültiges Datum";
    if (end < start) return "Das Ende liegt vor dem Beginn"; // ISO-Daten lassen sich als Text vergleichen
    if (dayCount(start, end) > MAX_VACATION_DAYS) {
        return `Ein Urlaub darf höchstens ${MAX_VACATION_DAYS} Tage lang sein`;
    }
    return null;
}

/** Der erste vorhandene Urlaub, der sich mit dem neuen Zeitraum überschneidet (sonst null) */
export function findOverlap(
    existing: VacationRange[],
    candidate: VacationRange,
): VacationRange | null {
    return (
        existing.find(
            (v) =>
                v.id !== candidate.id && // beim Bearbeiten nicht mit sich selbst vergleichen
                v.startDate <= candidate.endDate &&
                v.endDate >= candidate.startDate,
        ) ?? null
    );
}

export const overlapMessage = (v: VacationRange): string =>
    `Überschneidet sich mit dem Urlaub vom ${germanDay(v.startDate)} bis ${germanDay(v.endDate)}`;

/** Arbeitstage (Montag bis Freitag) im Zeitraum, ohne Feiertage */
export function countWorkdays(start: string, end: string): number {
    let count = 0;
    for (let day = start; day <= end; day = addDays(day, 1)) {
        if (weekdayIndex(day) < 5) count++;
    }
    return count;
}