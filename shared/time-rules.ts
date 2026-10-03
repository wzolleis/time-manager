// shared/time-rules.ts
export type Booking = {
    id: string;
    type: "kommen" | "gehen";
    bookedAt: Date;
};

export type Period = { from: Date; to: Date | null }; // to = null: läuft noch

const TZ = "Europe/Berlin";
const dayFormat = new Intl.DateTimeFormat("sv-SE", {timeZone: TZ}); // ergibt JJJJ-MM-TT
const timeFormat = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ, dateStyle: "short", timeStyle: "short",
});

export const localDay = (d: Date) => dayFormat.format(d);

const sorted = (entries: Booking[]) =>
    [...entries].sort((a, b) => a.bookedAt.getTime() - b.bookedAt.getTime());

/** null = gültig, sonst eine verständliche Fehlermeldung */
export function checkSequence(entries: Booking[]): string | null {
    const list = sorted(entries);
    let expected: Booking["type"] = "kommen";

    for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const when = timeFormat.format(e.bookedAt);

        if (i > 0 && e.bookedAt.getTime() === list[i - 1].bookedAt.getTime()) {
            return `Zwei Buchungen zur gleichen Zeit (${when})`;
        }
        if (e.type !== expected) {
            return expected === "kommen"
                ? `Um ${when} fehlt vorher ein "kommen"`
                : `Um ${when} fehlt vorher ein "gehen"`;
        }
        expected = expected === "kommen" ? "gehen" : "kommen";
    }
    return null;
}

/** Arbeitszeiten und Pausen aus einer gültigen Folge */
export function buildPeriods(entries: Booking[]): { work: Period[]; breaks: Period[] } {
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