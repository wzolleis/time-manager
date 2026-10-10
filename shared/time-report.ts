import {type Booking, buildPeriods} from "./time-rules";

export type DayTotals = {
    workMs: number;
    breakMs: number;
    running: boolean; // ein "kommen" ohne "gehen" läuft gerade
};

export function dayTotals(
    entries: Booking[],
    range: { start: Date; end: Date },
    now: Date,
): DayTotals {
    const {work, breaks} = buildPeriods(entries);
    const start = range.start.getTime();
    const end = range.end.getTime();
    const nowMs = now.getTime();

    let workMs = 0;
    let running = false;

    for (const p of work) {
        const from = Math.max(p.from.getTime(), start);
        // Ein laufender Zeitraum zählt bis jetzt, höchstens bis zum Ende des Tages
        const to = Math.min(p.to ? p.to.getTime() : nowMs, end);
        if (to > from) workMs += to - from;
        if (!p.to && p.from.getTime() <= nowMs && nowMs < end) running = true;
    }

    // Pausen liegen per Definition an einem Tag, eine Beschneidung ist nicht nötig
    const breakMs = breaks
        .filter((b) => b.from.getTime() >= start && b.from.getTime() < end)
        .reduce((sum, b) => sum + (b.to!.getTime() - b.from.getTime()), 0);

    return {workMs, breakMs, running};
}