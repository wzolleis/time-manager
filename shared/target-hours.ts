import type {DayRange} from "./day-range";
import {type HolidayDay, isHoliday} from "./holiday-rules";
import {isSickDay} from "./sick-leave-rules";
import {isVacationDay} from "./vacation-rules";
import {type SettingHistory, valueOn} from "./user-setting-rules";
import {weekdayIndex} from "./week";

const HOUR = 3_600_000;

export const WORKDAYS_PER_WEEK = 5; // Montag bis Freitag

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
 * Sollarbeitszeit eines Tages: an Arbeitstagen das Soll aus den Einstellungen, das an diesem Tag gilt
 * (Default 8 Stunden). Am Wochenende, an Feiertagen, an Krankheitstagen, im Urlaub und vor Beginn der
 * Zeiterfassung 0.
 */
export const targetMs = (
    day: string,
    vacations: DayRange[],
    holidays: HolidayDay[],
    sickLeaves: DayRange[],
    trackingStart: string | null,
    soll: SettingHistory,
): number =>
    dayKind(day, vacations, holidays, sickLeaves, trackingStart) === "workday" ? valueOn(soll, day) * HOUR : 0;
