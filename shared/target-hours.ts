import {weekdayIndex} from "./week";

const HOUR = 3_600_000;

export const DAILY_TARGET_MS = 8 * HOUR;
export const WORKDAYS_PER_WEEK = 5; // Montag bis Freitag
export const WEEKLY_TARGET_MS = DAILY_TARGET_MS * WORKDAYS_PER_WEEK; // 40 Stunden

/** Sollarbeitszeit eines Tages ("JJJJ-MM-TT"): Mo bis Fr 8 Stunden, am Wochenende 0 */
export const targetMs = (day: string): number =>
    weekdayIndex(day) < WORKDAYS_PER_WEEK ? DAILY_TARGET_MS : 0;