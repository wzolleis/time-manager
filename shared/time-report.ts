import {type Booking, buildPeriods} from "./time-rules";

export type DayTotals = {
    workMs: number;
    breakMs: number;
    running: boolean; // heute läuft ein Zeitraum
    missingGehen: boolean; // an diesem vergangenen Tag fehlt das gehen
};

export function dayTotals(entries: Booking[], range: {start: Date; end: Date}, now: Date): DayTotals {
    const {work, breaks} = buildPeriods(entries);
    const start = range.start.getTime();
    const end = range.end.getTime();
    const nowMs = now.getTime();

    let workMs = 0;
    let running = false;
    let missingGehen = false;

    for (const p of work) {
        if (p.to) {
            // Abgeschlossene Zeiträume werden am Tag beschnitten (Altdaten über Mitternacht stimmen so weiter)
            const from = Math.max(p.from.getTime(), start);
            const to = Math.min(p.to.getTime(), end);
            if (to > from) workMs += to - from;
        } else if (p.from.getTime() >= start && p.from.getTime() < end) {
            if (nowMs >= end) {
                missingGehen = true; // der Tag ist vorbei, das gehen fehlt
            } else if (nowMs >= p.from.getTime()) {
                workMs += nowMs - p.from.getTime();
                running = true;
            }
        }
    }

    // Pausen liegen per Definition an einem Tag, eine Beschneidung ist nicht nötig
    const breakMs = breaks
        .filter((b) => b.from.getTime() >= start && b.from.getTime() < end)
        .reduce((sum, b) => sum + (b.to!.getTime() - b.from.getTime()), 0);

    return {workMs, breakMs, running, missingGehen};
}
