import {type HolidayDay, isHoliday} from "./holiday-rules";
import {isVacationDay, type VacationRange} from "./vacation-rules";
import {weekdayIndex} from "./week";

const HOUR = 3_600_000;

export const DAILY_TARGET_MS = 8 * HOUR;
export const WORKDAYS_PER_WEEK = 5; // Montag bis Freitag
export const WEEKLY_TARGET_MS = DAILY_TARGET_MS * WORKDAYS_PER_WEEK; // 40 Stunden

export type DayKind = "workday" | "weekend" | "untracked" | "holiday" | "vacation"; // untracked: vor Beginn der Zeiterfassung

/**
 * Art eines Tages ("JJJJ-MM-TT"). Das Wochenende geht vor, dann der Beginn der Zeiterfassung, dann der Feiertag:
 * ein Feiertag im Urlaub ist ein Feiertag und verbraucht keinen Urlaubstag.
 * trackingStart ist der Tag der ersten Buchung (firstBookingDay), null: noch keine Buchung.
 */
export function dayKind(
    day: string,
    vacations: Pick<VacationRange, "startDate" | "endDate">[],
    holidays: HolidayDay[],
    trackingStart: string | null,
): DayKind {
    if (weekdayIndex(day) >= WORKDAYS_PER_WEEK) return "weekend";
    if (trackingStart === null || day < trackingStart) return "untracked";
    if (isHoliday(day, holidays)) return "holiday";
    if (isVacationDay(day, vacations)) return "vacation";
    return "workday";
}

/**
 * Sollarbeitszeit eines Tages: an Arbeitstagen 8 Stunden, am Wochenende, an Feiertagen, im Urlaub
 * und vor Beginn der Zeiterfassung 0
 */
export const targetMs = (
    day: string,
    vacations: Pick<VacationRange, "startDate" | "endDate">[],
    holidays: HolidayDay[],
    trackingStart: string | null,
): number => (dayKind(day, vacations, holidays, trackingStart) === "workday" ? DAILY_TARGET_MS : 0);
