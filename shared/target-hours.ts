import {type HolidayDay, isHoliday} from "./holiday-rules";
import {isVacationDay, type VacationRange} from "./vacation-rules";
import {weekdayIndex} from "./week";

const HOUR = 3_600_000;

export const DAILY_TARGET_MS = 8 * HOUR;
export const WORKDAYS_PER_WEEK = 5; // Montag bis Freitag
export const WEEKLY_TARGET_MS = DAILY_TARGET_MS * WORKDAYS_PER_WEEK; // 40 Stunden

export type DayKind = "workday" | "weekend" | "holiday" | "vacation";

/**
 * Art eines Tages ("JJJJ-MM-TT"). Das Wochenende geht vor, dann der Feiertag:
 * ein Feiertag im Urlaub ist ein Feiertag und verbraucht keinen Urlaubstag.
 */
export function dayKind(
    day: string,
    vacations: Pick<VacationRange, "startDate" | "endDate">[],
    holidays: HolidayDay[],
): DayKind {
    if (weekdayIndex(day) >= WORKDAYS_PER_WEEK) return "weekend";
    if (isHoliday(day, holidays)) return "holiday";
    if (isVacationDay(day, vacations)) return "vacation";
    return "workday";
}

/** Sollarbeitszeit eines Tages: an Arbeitstagen 8 Stunden, am Wochenende, an Feiertagen und im Urlaub 0 */
export const targetMs = (
    day: string,
    vacations: Pick<VacationRange, "startDate" | "endDate">[],
    holidays: HolidayDay[],
): number => (dayKind(day, vacations, holidays) === "workday" ? DAILY_TARGET_MS : 0);
