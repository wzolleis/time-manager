// Bewusst ohne Abhängigkeit zur DB, damit Client und Server dieselben Regeln nutzen
import {isValidDay} from "./day-range";

export type HolidayDay = { date: string }; // "JJJJ-MM-TT"
export type HolidayRange = { id: string; userId: string | null; date: string; name: string };

/** Der Feiertag an diesem Tag (sonst undefined) */
export const holidayOn = <H extends HolidayDay>(day: string, holidays: H[]): H | undefined =>
    holidays.find((h) => h.date === day);

export const isHoliday = (day: string, holidays: HolidayDay[]): boolean =>
    holidays.some((h) => h.date === day);

/**
 * Ein vorhandener Feiertag, mit dem der neue kollidiert (sonst null).
 * Pro Tag gibt es höchstens einen globalen Feiertag und pro User höchstens einen eigenen.
 * Ein eigener Feiertag an einem globalen Feiertag wäre doppelt und wird abgelehnt.
 * Ein globaler Feiertag an einem Tag, den einzelne User schon eingetragen haben, bleibt erlaubt.
 */
export function findHolidayClash(existing: HolidayRange[], candidate: HolidayRange): HolidayRange | null {
    return (
        existing.find(
            (h) =>
                h.id !== candidate.id && // beim Bearbeiten nicht mit sich selbst vergleichen
                h.date === candidate.date &&
                (h.userId === null || h.userId === candidate.userId),
        ) ?? null
    );
}

export const holidayClashMessage = (h: HolidayRange): string => {
    const day = h.date.split("-").reverse().join(".");
    return h.userId === null
        ? `Am ${day} ist bereits der Feiertag „${h.name}“ für alle eingetragen`
        : `Am ${day} ist bereits der Feiertag „${h.name}“ eingetragen`;
};

/** null = gültig, sonst eine verständliche Fehlermeldung */
export function checkHoliday(date: string, name: string): string | null {
    if (!isValidDay(date)) return "Bitte ein Datum wählen";
    if (name.trim() === "") return "Bitte einen Namen angeben";
    return null;
}
