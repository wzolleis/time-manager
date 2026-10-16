// shared/time-rules.ts
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
