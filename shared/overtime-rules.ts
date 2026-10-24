import {addDays, type DayRange, localDayRange, startOfLocalDay} from "./day-range";
import type {HolidayRange} from "./holiday-rules";
import {targetMs} from "./target-hours";
import {dayDiffMs, dayTotals} from "./time-report";
import {type Booking, firstBookingDay, localDay} from "./time-rules";

export const MAX_OFFSET_HOURS = 23;
export const MAX_OFFSET_MINUTES = MAX_OFFSET_HOURS * 60 + 59; // ±23:59

export type OffsetSign = "+" | "-";
export type OffsetParts = {sign: OffsetSign; hours: number; minutes: number};

/** Korrekturwert in Minuten aus Vorzeichen, Stunden und Minuten, wie im Dialog ausgewählt. −0:00 ergibt 0. */
export const toOffset = ({sign, hours, minutes}: OffsetParts): number => {
    const total = hours * 60 + minutes;
    return sign === "-" && total > 0 ? -total : total;
};

/** Vorzeichen, Stunden und Minuten zum Vorbelegen des Dialogs. Ohne Korrektur (null): +0:00 */
export const fromOffset = (offset: number | null): OffsetParts => {
    const abs = Math.abs(offset ?? 0);
    return {sign: (offset ?? 0) < 0 ? "-" : "+", hours: Math.floor(abs / 60), minutes: abs % 60};
};

/** null = gültig, sonst eine verständliche Fehlermeldung */
export function checkOffset(offset: number): string | null {
    if (!Number.isInteger(offset)) return "Der Korrekturwert muss eine ganze Zahl von Minuten sein";
    if (Math.abs(offset) > MAX_OFFSET_MINUTES) return "Der Korrekturwert darf höchstens ±23:59 Stunden betragen";
    return null;
}

/** Minuten als "+3:30" oder "−0:10" (mit echtem Minuszeichen wie formatDifference), 0 als "+0:00" */
export const formatOffset = (minutes: number): string => {
    const abs = Math.abs(minutes);
    return `${minutes < 0 ? "−" : "+"}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
};

/** Ganze Minuten eines Saldos, der Betrag wird abgerundet wie in formatDifference */
export const balanceMinutes = (ms: number): number => Math.trunc(ms / 60_000) || 0; // || 0: kein −0

export type OvertimeCorrection = {offset: number; created: Date};

/**
 * Saldo der Überstunden in ms: Korrekturwert plus Σ (Arbeitszeit − Soll) aller Tage ab dem Tag der Korrektur
 * bis heute, ohne Korrektur ab Beginn der Zeiterfassung. Jeder Tag zählt genau wie in den Berichten (dayDiffMs),
 * heute also mit dem vollen Soll. today ist der heutige Tag "JJJJ-MM-TT".
 */
export function overtimeBalanceMs(
    correction: OvertimeCorrection | null,
    entries: Booking[],
    vacations: DayRange[],
    holidays: Pick<HolidayRange, "date" | "name">[],
    sickLeaves: DayRange[],
    today: string,
    now: Date,
): number {
    const offsetMs = (correction?.offset ?? 0) * 60_000;
    const trackingStart = firstBookingDay(entries); // mit allen Buchungen, auch denen an Krankheitstagen
    const start = correction ? localDay(correction.created) : trackingStart;
    if (start === null) return offsetMs;

    // Ein Buchungspaar liegt immer an einem Tag, die Buchungen vor dem Start fallen also ganz weg
    const from = startOfLocalDay(start);
    const counted = entries.filter((e) => e.bookedAt >= from);

    let sum = offsetMs;
    for (let day = start; day <= today; day = addDays(day, 1)) {
        const {workMs} = dayTotals(counted, localDayRange(day), sickLeaves, now);
        const target = targetMs(day, vacations, holidays, sickLeaves, trackingStart);
        sum += dayDiffMs(day, today, workMs, target) ?? 0;
    }
    return sum;
}
