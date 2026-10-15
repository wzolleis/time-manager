import {addDays} from "./day-range";
import {type HolidayDay, isHoliday} from "./holiday-rules";
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

/** Arbeitstage (Montag bis Freitag) im Zeitraum, Feiertage zählen nicht mit */
export function countWorkdays(start: string, end: string, holidays: HolidayDay[]): number {
    let count = 0;
    for (let day = start; day <= end; day = addDays(day, 1)) {
        if (weekdayIndex(day) < 5 && !isHoliday(day, holidays)) count++;
    }
    return count;
}

/** Liegt der Tag ("JJJJ-MM-TT") in einem der Urlaube? Beginn und Ende zählen mit. */
export const isVacationDay = (
    day: string,
    vacations: Pick<VacationRange, "startDate" | "endDate">[],
): boolean => vacations.some((v) => v.startDate <= day && day <= v.endDate);

export const VACATION_DAYS_PER_YEAR = 30;

type DateRange = Pick<VacationRange, "startDate" | "endDate">;

/** Der Teil des Urlaubs, der im Jahr liegt (sonst null) */
function clipToYear(v: DateRange, year: number): DateRange | null {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const startDate = v.startDate > yearStart ? v.startDate : yearStart;
    const endDate = v.endDate < yearEnd ? v.endDate : yearEnd;
    return startDate <= endDate ? {startDate, endDate} : null;
}

/** Eingetragene Urlaubstage (Arbeitstage) eines Kalenderjahrs */
export const workdaysInYear = (vacations: DateRange[], year: number, holidays: HolidayDay[]): number =>
    vacations.reduce((sum, v) => {
        const part = clipToYear(v, year);
        return part ? sum + countWorkdays(part.startDate, part.endDate, holidays) : sum;
    }, 0);

export type VacationBalance = {
    taken: number; // Arbeitstage bis einschließlich heute
    planned: number; // Arbeitstage nach heute
    unplanned: number; // noch nicht verplant, nie negativ
    over: number; // über das Jahreskontingent hinaus eingetragen
};

/**
 * Urlaubskonto eines Kalenderjahrs. Resturlaub verfällt am Jahresende, deshalb zählt jeder Urlaub
 * nur mit den Arbeitstagen, die in diesem Jahr liegen (ein Urlaub über Silvester wird aufgeteilt).
 * Feiertage im Urlaub verbrauchen keinen Urlaubstag.
 */
export function vacationBalance(
    vacations: DateRange[],
    year: number,
    today: string,
    holidays: HolidayDay[],
): VacationBalance {
    let taken = 0;
    let planned = 0;

    for (const v of vacations) {
        const part = clipToYear(v, year);
        if (!part) continue; // liegt nicht in diesem Jahr
        const {startDate: start, endDate: end} = part;

        // ISO-Daten lassen sich als Text vergleichen
        if (end <= today) taken += countWorkdays(start, end, holidays);
        else if (start > today) planned += countWorkdays(start, end, holidays);
        else {
            taken += countWorkdays(start, today, holidays);
            planned += countWorkdays(addDays(today, 1), end, holidays);
        }
    }

    const used = taken + planned;
    return {
        taken,
        planned,
        unplanned: Math.max(0, VACATION_DAYS_PER_YEAR - used),
        over: Math.max(0, used - VACATION_DAYS_PER_YEAR),
    };
}

/**
 * null = erlaubt, sonst eine verständliche Fehlermeldung. Prüft jedes Jahr, das der Urlaub berührt.
 * Eine Änderung, die einen schon überzogenen Jahresurlaub nicht weiter erhöht, bleibt erlaubt,
 * damit sich alte Daten noch verkleinern lassen.
 */
export function checkYearLimit(
    existing: VacationRange[],
    candidate: VacationRange,
    holidays: HolidayDay[],
): string | null {
    const others = existing.filter((v) => v.id !== candidate.id); // beim Bearbeiten den alten Stand ersetzen
    const firstYear = Number(candidate.startDate.slice(0, 4));
    const lastYear = Number(candidate.endDate.slice(0, 4));

    for (let year = firstYear; year <= lastYear; year++) {
        const before = workdaysInYear(existing, year, holidays);
        const after = workdaysInYear([...others, candidate], year, holidays);
        if (after > VACATION_DAYS_PER_YEAR && after > before) {
            const free = Math.max(0, VACATION_DAYS_PER_YEAR - workdaysInYear(others, year, holidays));
            return `${year} wären es ${after} Urlaubstage, erlaubt sind ${VACATION_DAYS_PER_YEAR} (noch frei: ${free})`;
        }
    }
    return null;
}
