import {type DayRange, isInRanges} from "./day-range";
import type {HolidayDay} from "./holiday-rules";
import {type Booking, localDay} from "./time-rules";
import {checkRange, clipToYear, countWorkdays, findOverlap, germanDay, type VacationRange} from "./vacation-rules";

export type SickLeaveRange = VacationRange;

export const sickLeaveOverlapMessage = (s: SickLeaveRange): string =>
    `Überschneidet sich mit der Krankmeldung vom ${germanDay(s.startDate)} bis ${germanDay(s.endDate)}`;

/**
 * null = gültig, sonst eine verständliche Fehlermeldung. Prüft den Zeitraum und die Überschneidung mit
 * einer anderen Krankmeldung. Ein Urlaub im Zeitraum ist erlaubt, Krankheit geht vor.
 */
export function checkSickLeave(existing: SickLeaveRange[], candidate: SickLeaveRange): string | null {
    const problem = checkRange(candidate.startDate, candidate.endDate, "Eine Krankmeldung");
    if (problem) return problem;
    const clash = findOverlap(existing, candidate); // beim Ändern nicht mit sich selbst
    return clash ? sickLeaveOverlapMessage(clash) : null;
}

/** Ist der Tag ("JJJJ-MM-TT") als Krankheitstag eingetragen? */
export const isSickDay = (day: string, sickLeaves: DayRange[]): boolean => isInRanges(day, sickLeaves);

/** Krankheitstage (Arbeitstage) eines Kalenderjahrs, eine Krankmeldung über Silvester wird aufgeteilt */
export const sickDaysInYear = (sickLeaves: DayRange[], year: number, holidays: HolidayDay[]): number =>
    sickLeaves.reduce((sum, s) => {
        const part = clipToYear(s, year);
        return part ? sum + countWorkdays(part.startDate, part.endDate, holidays) : sum;
    }, 0);

/**
 * Die Buchungen außerhalb von Krankheitstagen. Nur für die Summen der Arbeitszeit, nie für die Prüfung
 * der Abfolge: Buchungen an Krankheitstagen bleiben gespeichert, zählen aber nicht.
 */
export const withoutSickDays = <B extends Booking>(entries: B[], sickLeaves: DayRange[]): B[] =>
    entries.filter((e) => !isSickDay(localDay(e.bookedAt), sickLeaves));

/** Zahl der Buchungen, deren Tag im Zeitraum liegt */
export const countBookingsInRange = (entries: Booking[], range: DayRange): number =>
    entries.filter((e) => isInRanges(localDay(e.bookedAt), [range])).length;

/** Hinweis zu einer Buchung an einem Krankheitstag */
export const sickDayMessage = (day: string): string =>
    `Der ${germanDay(day)} ist als Krankheitstag eingetragen. Die Buchung zählt nicht zur Arbeitszeit.`;

/** Hinweis zu Buchungen im Zeitraum einer Krankmeldung */
export const bookingsInRangeMessage = (count: number): string =>
    count === 1
        ? "Im Zeitraum gibt es 1 Buchung. Sie zählt nicht zur Arbeitszeit."
        : `Im Zeitraum gibt es ${count} Buchungen. Sie zählen nicht zur Arbeitszeit.`;
