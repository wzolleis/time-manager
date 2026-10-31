// shared/time-rules.ts
import {localTimeToUtc} from "./day-range";

export type Booking = {
    id: string;
    type: "kommen" | "gehen";
    bookedAt: Date;
};

export type Period = {from: Date; to: Date | null}; // to = null: läuft noch

const TZ = "Europe/Berlin";
const dayFormat = new Intl.DateTimeFormat("sv-SE", {timeZone: TZ}); // ergibt JJJJ-MM-TT
const timeFormat = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
});

export const localDay = (d: Date) => dayFormat.format(d);
const clockFormat = new Intl.DateTimeFormat("de-DE", {timeZone: TZ, hour: "2-digit", minute: "2-digit"});
const formatClock = (d: Date) => clockFormat.format(d); // "HH:mm" in Berliner Zeit

const sorted = (entries: Booking[]) => [...entries].sort((a, b) => a.bookedAt.getTime() - b.bookedAt.getTime());

/** null = gültig, sonst eine verständliche Fehlermeldung */
export function checkSequence(entries: Booking[]): string | null {
    const list = sorted(entries);
    let expected: Booking["type"] = "kommen";

    for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const prev = list[i - 1];
        const when = timeFormat.format(e.bookedAt);

        if (prev && e.bookedAt.getTime() === prev.bookedAt.getTime()) {
            return `Zwei Buchungen zur gleichen Zeit (${when})`;
        }
        if (e.type !== expected) {
            return expected === "kommen"
                ? `Um ${when} fehlt vorher ein "kommen"`
                : `Um ${when} fehlt vorher ein "gehen"`;
        }
        // Ein gehen schließt das kommen davor ab: beide müssen am selben lokalen Tag liegen
        if (e.type === "gehen" && prev && localDay(e.bookedAt) !== localDay(prev.bookedAt)) {
            return `Kommen (${timeFormat.format(prev.bookedAt)}) und Gehen (${when}) müssen am selben Tag liegen`;
        }
        expected = expected === "kommen" ? "gehen" : "kommen";
    }
    return null;
}

/** Arbeitszeiten und Pausen aus einer gültigen Folge */
export function buildPeriods(entries: Booking[]): {work: Period[]; breaks: Period[]} {
    const list = sorted(entries);
    const work: Period[] = [];
    const breaks: Period[] = [];

    for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const next = list[i + 1];

        if (e.type === "kommen") {
            work.push({from: e.bookedAt, to: next ? next.bookedAt : null});
        } else if (next && localDay(e.bookedAt) === localDay(next.bookedAt)) {
            breaks.push({from: e.bookedAt, to: next.bookedAt});
        }
    }
    return {work, breaks};
}

/** Welche Buchung wäre vor dem Zeitpunkt als Nächstes dran? */
export function nextType(entries: Booking[], before: Date): Booking["type"] {
    const last = sorted(entries)
        .filter((e) => e.bookedAt < before)
        .at(-1);
    return last?.type === "kommen" ? "gehen" : "kommen";
}

/** Das kommen, zu dem an einem früheren Tag das gehen fehlt (sonst null) */
export function findMissingGehen(entries: Booking[], now: Date): Booking | null {
    const last = sorted(entries).at(-1);
    if (last?.type === "kommen" && localDay(last.bookedAt) < localDay(now)) return last;
    return null;
}

/** Das Gegenstück einer Buchung: zum kommen das folgende gehen, zum gehen das kommen davor (sonst null) */
export function findPartner(entries: Booking[], id: string): Booking | null {
    const list = sorted(entries);
    const i = list.findIndex((e) => e.id === id);
    if (i < 0) return null;
    const partner = list[i].type === "kommen" ? list[i + 1] : list[i - 1];
    return partner ?? null;
}

/** Tag ("JJJJ-MM-TT") der ersten Buchung, also der Beginn der Zeiterfassung (null: noch keine Buchung) */
export function firstBookingDay(entries: Booking[]): string | null {
    const first = sorted(entries)[0];
    return first ? localDay(first.bookedAt) : null;
}

/** null = gültig, sonst eine Fehlermeldung. Ein Projekt gibt es nur beim kommen, es gilt für das ganze Paar. */
export function checkProject(type: Booking["type"], projectId: string | null | undefined): string | null {
    return type === "gehen" && projectId ? 'Ein Projekt kann nur beim "kommen" gebucht werden' : null;
}

// Zeitraum (features/changes/time-stamp-whole-day.md, time-stamp-period.md): am leeren Tag ab Beginn, sonst nach
// dem letzten Gehen. Pflichtpause für die Arbeitszeit des ganzen Tages, höchstens 6 h am Stück, höchstens 10 h am Tag.
/** Vorgaben eines leeren Tages für Dialog und MCP-Tool: Beginn 08:00, 8 h Arbeitszeit */
export const WORK_DAY_START = "08:00";
export const WORK_DAY_MINUTES = 8 * 60;

const MINUTE = 60_000;
const BREAK_AFTER_MINUTES = 6 * 60;
const MAX_WORK_MINUTES = 10 * 60;
const MIN_SPLIT_BREAK_MINUTES = 15; // kürzester Pausenabschnitt, wenn ein neuer Block nach 6 h geteilt wird

/** Pause in Minuten zur Arbeitszeit eines Tages: bis 6 h keine, bis 9 h 30 min, darüber 45 min */
export const breakMinutes = (workMinutes: number): number =>
    workMinutes <= 6 * 60 ? 0 : workMinutes <= 9 * 60 ? 30 : 45;

/** Die neuen Buchungen und die Pause, die dafür eingeplant ist (Abstand zum letzten Gehen und Teilung nach 6 h) */
export type WorkDayPlan = {bookings: Booking[]; pauseMinutes: number};

type Planned = {plan: WorkDayPlan; earliest: Date | null; problem: string | null};

const minutesOf = (periods: Period[]) =>
    periods.reduce((sum, p) => sum + ((p.to?.getTime() ?? p.from.getTime()) - p.from.getTime()) / MINUTE, 0);

// Ein Block ab from, nach 6 h geteilt, wenn splitPause > 0 und er länger als 6 h ist
function block(from: number, workMinutes: number, splitPause: number): Booking[] {
    const at = (minutes: number) => new Date(from + minutes * MINUTE);
    if (workMinutes <= BREAK_AFTER_MINUTES || splitPause === 0) {
        return [
            {id: "neu-1", type: "kommen", bookedAt: at(0)},
            {id: "neu-2", type: "gehen", bookedAt: at(workMinutes)},
        ];
    }
    return [
        {id: "neu-1", type: "kommen", bookedAt: at(0)},
        {id: "neu-2", type: "gehen", bookedAt: at(BREAK_AFTER_MINUTES)},
        {id: "neu-3", type: "kommen", bookedAt: at(BREAK_AFTER_MINUTES + splitPause)},
        {id: "neu-4", type: "gehen", bookedAt: at(workMinutes + splitPause)},
    ];
}

function planPeriod(existing: Booking[], day: string, workMinutes: number, start?: string): Planned {
    const none = (problem: string, earliest: Date | null = null): Planned => ({
        plan: {bookings: [], pauseMinutes: 0},
        earliest,
        problem,
    });
    // Das letzte neue Gehen liegt am selben Tag (Regel 4), sonst gibt es keinen Plan
    const planned = (bookings: Booking[], pauseMinutes: number, earliest: Date | null): Planned => {
        const end = bookings[bookings.length - 1].bookedAt;
        if (localDay(end) !== day) {
            return none(`Das Gehen (${timeFormat.format(end)}) muss am selben Tag liegen`, earliest);
        }
        return {plan: {bookings, pauseMinutes}, earliest, problem: null};
    };
    const dayEntries = sorted(existing).filter((e) => localDay(e.bookedAt) === day);

    // Leerer Tag: ab Beginn, Pause nach 6 h
    if (dayEntries.length === 0) {
        if (workMinutes > MAX_WORK_MINUTES) return none("Die Arbeitszeit darf höchstens 10 Stunden betragen");
        const pause = breakMinutes(workMinutes);
        const from = localTimeToUtc(day, start ?? WORK_DAY_START).getTime();
        return planned(block(from, workMinutes, pause), pause, null);
    }

    const last = dayEntries.at(-1)!;
    if (last.type === "kommen") return none(`Erst das Gehen zum Kommen um ${formatClock(last.bookedAt)} buchen`);

    const {work, breaks} = buildPeriods(dayEntries);
    const total = minutesOf(work) + workMinutes;
    if (total > MAX_WORK_MINUTES) return none("Die Arbeitszeit des Tages darf höchstens 10 Stunden betragen");
    const missing = Math.max(0, breakMinutes(total) - minutesOf(breaks));
    const lastEnd = last.bookedAt.getTime();

    // Über 6 h wird der neue Block geteilt, der fehlende Rest liegt dort (Regel 7), sonst vor dem Kommen (Regel 6)
    const split = workMinutes > BREAK_AFTER_MINUTES;
    const earliest = new Date(lastEnd + (split ? 1 : Math.max(missing, 1)) * MINUTE);
    const from = start ? localTimeToUtc(day, start) : earliest;
    if (from < earliest) return none(`Beginn frühestens um ${formatClock(earliest)}`, earliest);

    const gap = (from.getTime() - lastEnd) / MINUTE;
    // Teilung nach 6 h (Regel 7): dort liegt der fehlende Rest, mindestens 15 min.
    // Ein späterer Beginn zählt als Pause, die 1 min Abstand nicht.
    let splitPause = 0;
    if (split) {
        const countedGap = gap > 1 ? gap : 0;
        splitPause = Math.max(missing - countedGap, MIN_SPLIT_BREAK_MINUTES);
    }
    return planned(block(from.getTime(), workMinutes, splitPause), gap + splitPause, earliest);
}

/** Die neuen Buchungen eines Zeitraums am Tag ("JJJJ-MM-TT"), leer, wenn eine Regel verletzt ist */
export const planWorkDay = (existing: Booking[], day: string, workMinutes: number, start?: string): WorkDayPlan =>
    planPeriod(existing, day, workMinutes, start).plan;

/** Frühester Beginn eines Zeitraums an einem Tag mit Buchungen (null: leerer Tag oder offenes Kommen) */
export const earliestStart = (existing: Booking[], day: string, workMinutes: number): Date | null =>
    planPeriod(existing, day, workMinutes).earliest;

/** null = der Zeitraum lässt sich zu den vorhandenen Buchungen eintragen, sonst eine Fehlermeldung */
export function checkWorkDay(existing: Booking[], day: string, workMinutes: number, start?: string): string | null {
    if (workMinutes <= 0) return "Die Arbeitszeit muss größer als 0 sein";
    const {plan, problem} = planPeriod(existing, day, workMinutes, start);
    return problem ?? checkSequence([...existing, ...plan.bookings]);
}
