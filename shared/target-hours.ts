import {isVacationDay, type VacationRange} from "./vacation-rules";
import {weekdayIndex} from "./week";

const HOUR = 3_600_000;

export const DAILY_TARGET_MS = 8 * HOUR;
export const WORKDAYS_PER_WEEK = 5; // Montag bis Freitag
export const WEEKLY_TARGET_MS = DAILY_TARGET_MS * WORKDAYS_PER_WEEK; // 40 Stunden

/** Sollarbeitszeit eines Tages ("JJJJ-MM-TT"): Mo bis Fr 8 Stunden, am Wochenende und im Urlaub 0 */
export const targetMs = (
    day: string,
    vacations: Pick<VacationRange, "startDate" | "endDate">[],
): number =>
    weekdayIndex(day) < WORKDAYS_PER_WEEK && !isVacationDay(day, vacations) ? DAILY_TARGET_MS : 0;