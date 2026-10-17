import type {DayRange} from "./day-range";
import {type HolidayDay, isHoliday} from "./holiday-rules";
import {isSickDay} from "./sick-leave-rules";
import {isVacationDay} from "./vacation-rules";
import {weekdayIndex} from "./week";

const HOUR = 3_600_000;

export const DAILY_TARGET_MS = 8 * HOUR;
export const WORKDAYS_PER_WEEK = 5; // Montag bis Freitag
export const WEEKLY_TARGET_MS = DAILY_TARGET_MS * WORKDAYS_PER_WEEK; // 40 Stunden

export type DayKind = "workday" | "weekend" | "untracked" | "holiday" | "sick" | "vacation"; // untracked: vor Beginn der Zeiterfassung

/**
 * Art eines Tages ("JJJJ-MM-TT"). Das Wochenende geht vor, dann der Beginn der Zeiterfassung, dann der Feiertag:
 * ein Feiertag im Urlaub ist ein Feiertag und verbraucht keinen Urlaubstag. Danach kommt die Krankheit,
 * auch sie geht dem Urlaub vor (§ 9 BUrlG).
 * trackingStart ist der Tag der ersten Buchung (firstBookingDay), null: noch keine Buchung.
 */
export function dayKind(
    day: string,
    vacations: DayRange[],
    holidays: HolidayDay[],
    sickLeaves: DayRange[],
    trackingStart: string | null,
): DayKind {
    if (weekdayIndex(day) >= WORKDAYS_PER_WEEK) return "weekend";
    if (trackingStart === null || day < trackingStart) return "untracked";
    if (isHoliday(day, holidays)) return "holiday";
    if (isSickDay(day, sickLeaves)) return "sick";
    if (isVacationDay(day, vacations)) return "vacation";
    return "workday";
}

/**
 * Sollarbeitszeit eines Tages: an Arbeitstagen 8 Stunden, am Wochenende, an Feiertagen, an Krankheitstagen,
 * im Urlaub und vor Beginn der Zeiterfassung 0
 */
export const targetMs = (
    day: string,
    vacations: DayRange[],
    holidays: HolidayDay[],
    sickLeaves: DayRange[],
    trackingStart: string | null,
): number => (dayKind(day, vacations, holidays, sickLeaves, trackingStart) === "workday" ? DAILY_TARGET_MS : 0);
