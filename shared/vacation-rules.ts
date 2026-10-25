import {addDays, type DayRange, isInRanges, isValidDay} from "./day-range";
import {type HolidayDay, isHoliday} from "./holiday-rules";
import {type SettingHistory, valueOn} from "./user-setting-rules";
import {weekdayIndex} from "./week";

export type VacationRange = {id: string; startDate: string; endDate: string};

export const MAX_VACATION_DAYS = 366;

const DAY_MS = 86_400_000;
const utc = (day: string): number => {
    const [y, m, d] = day.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
};

/** Kalendertage inklusive Beginn und Ende */
export const dayCount = (start: string, end: string): number => Math.round((utc(end) - utc(start)) / DAY_MS) + 1;

/** Deutsches Datum: "2026-06-08" wird zu "08.06.2026" */
export const germanDay = (day: string): string => day.split("-").reverse().join(".");

/** null = gültig, sonst eine verständliche Fehlermeldung. what nennt den Zeitraum in der Meldung zur Länge. */
export function checkRange(start: string, end: string, what = "Ein Urlaub"): string | null {
    if (!isValidDay(start) || !isValidDay(end)) return "Ungültiges Datum";
    if (end < start) return "Das Ende liegt vor dem Beginn"; // ISO-Daten lassen sich als Text vergleichen
    if (dayCount(start, end) > MAX_VACATION_DAYS) {
        return `${what} darf höchstens ${MAX_VACATION_DAYS} Tage lang sein`;
    }
    return null;
}

/** Der erste vorhandene Urlaub, der sich mit dem neuen Zeitraum überschneidet (sonst null) */
export function findOverlap(existing: VacationRange[], candidate: VacationRange): VacationRange | null {
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
export const isVacationDay = (day: string, vacations: DayRange[]): boolean => isInRanges(day, vacations);

/**
 * Urlaubstage im Zeitraum: Arbeitstage ohne Feiertage und ohne Krankheitstage.
 * Ein Krankheitstag im Urlaub verbraucht keinen Urlaubstag (§ 9 BUrlG).
 */
export function countVacationDays(start: string, end: string, holidays: HolidayDay[], sickLeaves: DayRange[]): number {
    let count = 0;
    for (let day = start; day <= end; day = addDays(day, 1)) {
        if (weekdayIndex(day) < 5 && !isHoliday(day, holidays) && !isInRanges(day, sickLeaves)) count++;
    }
    return count;
}

/** Urlaubstage des Jahres aus den Einstellungen: es gilt der Wert vom 1. Januar (Regel 9) */
export const vacationDaysOfYear = (vacationDays: SettingHistory, year: number): number =>
    valueOn(vacationDays, `${year}-01-01`);

/** Der Teil des Zeitraums, der im Jahr liegt (sonst null) */
export function clipToYear(v: DayRange, year: number): DayRange | null {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const startDate = v.startDate > yearStart ? v.startDate : yearStart;
    const endDate = v.endDate < yearEnd ? v.endDate : yearEnd;
    return startDate <= endDate ? {startDate, endDate} : null;
}

/** Eingetragene Urlaubstage (Arbeitstage ohne Krankheitstage) eines Kalenderjahrs */
export const workdaysInYear = (
    vacations: DayRange[],
    year: number,
    holidays: HolidayDay[],
    sickLeaves: DayRange[],
): number =>
    vacations.reduce((sum, v) => {
        const part = clipToYear(v, year);
        return part ? sum + countVacationDays(part.startDate, part.endDate, holidays, sickLeaves) : sum;
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
 * Feiertage und Krankheitstage im Urlaub verbrauchen keinen Urlaubstag.
 */
export function vacationBalance(
    vacations: DayRange[],
    year: number,
    today: string,
    holidays: HolidayDay[],
    sickLeaves: DayRange[],
    vacationDays: SettingHistory,
): VacationBalance {
    const count = (start: string, end: string) => countVacationDays(start, end, holidays, sickLeaves);
    let taken = 0;
    let planned = 0;

    for (const v of vacations) {
        const part = clipToYear(v, year);
        if (!part) continue; // liegt nicht in diesem Jahr
        const {startDate: start, endDate: end} = part;

        // ISO-Daten lassen sich als Text vergleichen
        if (end <= today) taken += count(start, end);
        else if (start > today) planned += count(start, end);
        else {
            taken += count(start, today);
            planned += count(addDays(today, 1), end);
        }
    }

    const used = taken + planned;
    const allowed = vacationDaysOfYear(vacationDays, year);
    return {
        taken,
        planned,
        unplanned: Math.max(0, allowed - used),
        over: Math.max(0, used - allowed),
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
    sickLeaves: DayRange[],
    vacationDays: SettingHistory,
): string | null {
    const others = existing.filter((v) => v.id !== candidate.id); // beim Bearbeiten den alten Stand ersetzen
    const firstYear = Number(candidate.startDate.slice(0, 4));
    const lastYear = Number(candidate.endDate.slice(0, 4));

    for (let year = firstYear; year <= lastYear; year++) {
        const before = workdaysInYear(existing, year, holidays, sickLeaves);
        const after = workdaysInYear([...others, candidate], year, holidays, sickLeaves);
        const allowed = vacationDaysOfYear(vacationDays, year);
        if (after > allowed && after > before) {
            const free = Math.max(0, allowed - workdaysInYear(others, year, holidays, sickLeaves));
            return `${year} wären es ${after} Urlaubstage, erlaubt sind ${allowed} (noch frei: ${free})`;
        }
    }
    return null;
}

/**
 * null = gültig, sonst eine verständliche Fehlermeldung. Prüft in der Reihenfolge des Servers:
 * Zeitraum, Überschneidung mit einem anderen Urlaub, Jahresurlaub.
 */
export function checkVacation(
    existing: VacationRange[],
    candidate: VacationRange,
    holidays: HolidayDay[],
    sickLeaves: DayRange[],
    vacationDays: SettingHistory,
): string | null {
    const problem = checkRange(candidate.startDate, candidate.endDate);
    if (problem) return problem;
    const clash = findOverlap(existing, candidate);
    if (clash) return overlapMessage(clash);
    return checkYearLimit(existing, candidate, holidays, sickLeaves, vacationDays);
}
