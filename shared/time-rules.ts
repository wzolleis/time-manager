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

// Ganzer Tag (features/changes/time-stamp-whole-day.md): Pause nach 6 h Arbeit, höchstens 10 h
const MINUTE = 60_000;
const BREAK_AFTER_MINUTES = 6 * 60;
const MAX_WORK_MINUTES = 10 * 60;

/** Pause in Minuten zur Arbeitszeit: bis 6 h keine, bis 9 h 30 min, darüber 45 min */
export const breakMinutes = (workMinutes: number): number =>
    workMinutes <= 6 * 60 ? 0 : workMinutes <= 9 * 60 ? 30 : 45;

/** Die Buchungspaare eines ganzen Tages ("JJJJ-MM-TT") ab Beginn ("HH:mm"), mit Pause nach 6 h Arbeit */
export function planWorkDay(day: string, start: string, workMinutes: number): Booking[] {
    const from = localTimeToUtc(day, start).getTime();
    const at = (minutes: number) => new Date(from + minutes * MINUTE);
    const pause = breakMinutes(workMinutes);
    if (pause === 0) {
        return [
            {id: "neu-1", type: "kommen", bookedAt: at(0)},
            {id: "neu-2", type: "gehen", bookedAt: at(workMinutes)},
        ];
    }
    return [
        {id: "neu-1", type: "kommen", bookedAt: at(0)},
        {id: "neu-2", type: "gehen", bookedAt: at(BREAK_AFTER_MINUTES)},
        {id: "neu-3", type: "kommen", bookedAt: at(BREAK_AFTER_MINUTES + pause)},
        {id: "neu-4", type: "gehen", bookedAt: at(workMinutes + pause)},
    ];
}

/** null = der ganze Tag lässt sich zu den vorhandenen Buchungen eintragen, sonst eine Fehlermeldung */
export function checkWorkDay(existing: Booking[], day: string, start: string, workMinutes: number): string | null {
    if (workMinutes <= 0) return "Die Arbeitszeit muss größer als 0 sein";
    if (workMinutes > MAX_WORK_MINUTES) return "Die Arbeitszeit darf höchstens 10 Stunden betragen";
    if (existing.some((e) => localDay(e.bookedAt) === day)) {
        return "An diesem Tag gibt es schon Buchungen, bitte einzeln nachtragen";
    }
    const planned = planWorkDay(day, start, workMinutes);
    const end = planned.at(-1)!.bookedAt;
    if (localDay(end) !== day) {
        return `Das Gehen (${timeFormat.format(end)}) muss am selben Tag liegen`;
    }
    return checkSequence([...existing, ...planned]);
}
