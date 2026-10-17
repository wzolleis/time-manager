import {describe, expect, it} from "vitest";
import {
    type Booking,
    buildPeriods,
    checkSequence,
    findMissingGehen,
    findPartner,
    firstBookingDay,
    localDay,
    nextType,
} from "./time-rules";

const b = (id: string, type: Booking["type"], iso: string): Booking => ({
    id,
    type,
    bookedAt: new Date(iso),
});

// Sommerzeit: 08:00 Berlin = 06:00 UTC
const workday = [
    b("1", "kommen", "2026-06-10T06:00:00Z"), // 08:00
    b("2", "gehen", "2026-06-10T10:00:00Z"), // 12:00
    b("3", "kommen", "2026-06-10T10:30:00Z"), // 12:30
    b("4", "gehen", "2026-06-10T15:00:00Z"), // 17:00
];

describe("checkSequence", () => {
    it("akzeptiert eine leere Folge", () => {
        expect(checkSequence([])).toBeNull();
    });

    it("akzeptiert einen normalen Arbeitstag mit Pause", () => {
        expect(checkSequence(workday)).toBeNull();
    });

    it("akzeptiert eine offene Folge (letzter Eintrag ist kommen)", () => {
        expect(checkSequence(workday.slice(0, 3))).toBeNull();
    });

    it("lehnt eine Nachtschicht über Mitternacht ab", () => {
        const night = [
            b("1", "kommen", "2026-06-09T20:00:00Z"), // 22:00 Berlin, 9.6.
            b("2", "gehen", "2026-06-10T04:00:00Z"), // 06:00 Berlin, 10.6.
        ];
        expect(checkSequence(night)).toContain("selben Tag");
    });

    it("akzeptiert ein gehen kurz vor Mitternacht", () => {
        expect(
            checkSequence([
                b("1", "kommen", "2026-06-10T21:00:00Z"), // 23:00 Berlin
                b("2", "gehen", "2026-06-10T21:59:00Z"), // 23:59 Berlin
            ]),
        ).toBeNull();
    });

    it("lehnt ein gehen kurz nach Mitternacht ab", () => {
        const result = checkSequence([
            b("1", "kommen", "2026-06-10T21:59:00Z"), // 23:59 Berlin
            b("2", "gehen", "2026-06-10T22:01:00Z"), // 00:01 Berlin am nächsten Tag
        ]);
        expect(result).toContain("selben Tag");
    });

    it("bestimmt den Tag lokal, nicht in UTC", () => {
        // 00:30 und 08:00 Berlin: am selben lokalen Tag, aber an zwei UTC-Tagen
        expect(
            checkSequence([b("1", "kommen", "2026-06-09T22:30:00Z"), b("2", "gehen", "2026-06-10T06:00:00Z")]),
        ).toBeNull();
    });

    it("erlaubt ein kommen am Tag nach dem gehen", () => {
        expect(
            checkSequence([
                b("1", "kommen", "2026-06-09T06:00:00Z"),
                b("2", "gehen", "2026-06-09T14:00:00Z"),
                b("3", "kommen", "2026-06-10T06:00:00Z"),
            ]),
        ).toBeNull();
    });

    it("sortiert die Eingabe selbst, die Reihenfolge im Array ist egal", () => {
        expect(checkSequence([...workday].reverse())).toBeNull();
    });

    it("lehnt zweimal kommen ab", () => {
        const result = checkSequence([
            b("1", "kommen", "2026-06-10T06:00:00Z"),
            b("2", "kommen", "2026-06-10T07:00:00Z"),
        ]);
        expect(result).toContain('fehlt vorher ein "gehen"');
    });

    it("lehnt zweimal gehen ab", () => {
        const result = checkSequence([
            b("1", "kommen", "2026-06-10T06:00:00Z"),
            b("2", "gehen", "2026-06-10T07:00:00Z"),
            b("3", "gehen", "2026-06-10T08:00:00Z"),
        ]);
        expect(result).toContain('fehlt vorher ein "kommen"');
    });

    it("lehnt eine Folge ab, die mit gehen beginnt", () => {
        const result = checkSequence([b("1", "gehen", "2026-06-10T06:00:00Z")]);
        expect(result).toContain('fehlt vorher ein "kommen"');
    });

    it("lehnt zwei Buchungen zur gleichen Zeit ab", () => {
        const result = checkSequence([
            b("1", "kommen", "2026-06-10T06:00:00Z"),
            b("2", "gehen", "2026-06-10T06:00:00Z"),
        ]);
        expect(result).toContain("gleichen Zeit");
    });

    it("verändert das übergebene Array nicht", () => {
        const input = [...workday].reverse();
        const copy = [...input];
        checkSequence(input);
        expect(input).toEqual(copy);
    });
});

describe("checkSequence beim Bearbeiten", () => {
    it("lehnt ein gehen ab, das auf den nächsten Tag verschoben wird", () => {
        const edited = workday.map((e) => (e.id === "4" ? {...e, bookedAt: new Date("2026-06-11T06:00:00Z")} : e));
        expect(checkSequence(edited)).toContain("selben Tag");
    });

    it("akzeptiert eine Korrektur innerhalb der Lücken", () => {
        // gehen (Id 2) von 12:00 auf 11:45
        const edited = workday.map((e) => (e.id === "2" ? {...e, bookedAt: new Date("2026-06-10T09:45:00Z")} : e));
        expect(checkSequence(edited)).toBeNull();
    });

    it("lehnt das Löschen eines einzelnen gehen mitten in der Folge ab", () => {
        const afterDelete = workday.filter((e) => e.id !== "2");
        expect(checkSequence(afterDelete)).not.toBeNull();
    });

    it("akzeptiert das Löschen eines kompletten Paares", () => {
        const afterDelete = workday.filter((e) => e.id !== "3" && e.id !== "4");
        expect(checkSequence(afterDelete)).toBeNull();
    });
});

describe("buildPeriods", () => {
    it("liefert zwei Arbeitszeiten und eine Pause", () => {
        const {work, breaks} = buildPeriods(workday);
        expect(work).toHaveLength(2);
        expect(breaks).toHaveLength(1);
        expect(breaks[0].from).toEqual(new Date("2026-06-10T10:00:00Z"));
        expect(breaks[0].to).toEqual(new Date("2026-06-10T10:30:00Z"));
    });

    it("markiert die laufende Arbeitszeit mit to = null", () => {
        const {work} = buildPeriods(workday.slice(0, 3));
        expect(work.at(-1)?.to).toBeNull();
    });

    it("zählt gehen und kommen an verschiedenen Tagen nicht als Pause", () => {
        const {breaks} = buildPeriods([
            b("1", "kommen", "2026-06-09T06:00:00Z"),
            b("2", "gehen", "2026-06-09T14:00:00Z"),
            b("3", "kommen", "2026-06-10T06:00:00Z"),
        ]);
        expect(breaks).toHaveLength(0);
    });

    it("bestimmt den Tag lokal, nicht in UTC (Mitternacht in Berlin)", () => {
        // 22:30 UTC = 00:30 Berlin am nächsten Tag
        const {breaks} = buildPeriods([
            b("1", "kommen", "2026-06-09T20:00:00Z"), // 22:00 Berlin, 9.6.
            b("2", "gehen", "2026-06-09T21:30:00Z"), // 23:30 Berlin, 9.6.
            b("3", "kommen", "2026-06-09T22:30:00Z"), // 00:30 Berlin, 10.6.
        ]);
        expect(breaks).toHaveLength(0);
    });

    it("erkennt eine Pause kurz nach lokaler Mitternacht am selben Tag", () => {
        // beide Buchungen am 10.6. in Berlin, aber noch am 9.6. in UTC
        const {breaks} = buildPeriods([
            b("1", "kommen", "2026-06-09T22:05:00Z"), // 00:05 Berlin, 10.6.
            b("2", "gehen", "2026-06-09T22:20:00Z"), // 00:20 Berlin, 10.6.
            b("3", "kommen", "2026-06-09T22:40:00Z"), // 00:40 Berlin, 10.6.
        ]);
        expect(breaks).toHaveLength(1);
    });

    it("funktioniert über den Wechsel auf Winterzeit", () => {
        // 25.10.2026: Sommerzeit endet, die Pause liegt am selben lokalen Tag
        const {breaks} = buildPeriods([
            b("1", "kommen", "2026-10-25T05:00:00Z"),
            b("2", "gehen", "2026-10-25T10:00:00Z"),
            b("3", "kommen", "2026-10-25T10:30:00Z"),
        ]);
        expect(breaks).toHaveLength(1);
    });
});

describe("localDay", () => {
    it("liefert den lokalen Kalendertag in Berlin", () => {
        expect(localDay(new Date("2026-06-09T22:30:00Z"))).toBe("2026-06-10");
        expect(localDay(new Date("2026-06-09T21:30:00Z"))).toBe("2026-06-09");
    });

    describe("nextType", () => {
        it("beginnt mit kommen", () => {
            expect(nextType([], new Date("2026-06-10T22:00:00Z"))).toBe("kommen");
        });

        it("nach einem kommen folgt gehen", () => {
            expect(nextType(workday.slice(0, 1), new Date("2026-06-10T22:00:00Z"))).toBe("gehen");
        });

        it("nach einem gehen folgt kommen", () => {
            expect(nextType(workday, new Date("2026-06-10T22:00:00Z"))).toBe("kommen");
        });

        it("berücksichtigt nur Buchungen vor dem Zeitpunkt", () => {
            // vor 11:00 Berlin ist das letzte kommen 08:00, also folgt gehen
            expect(nextType(workday, new Date("2026-06-10T09:00:00Z"))).toBe("gehen");
        });
    });

    describe("findMissingGehen", () => {
        const forgotten = [b("1", "kommen", "2026-06-09T06:00:00Z")];

        it("findet ein kommen eines früheren Tages ohne gehen", () => {
            expect(findMissingGehen(forgotten, new Date("2026-06-10T09:00:00Z"))?.id).toBe("1");
        });

        it("meldet nichts, solange der Tag des kommen läuft", () => {
            expect(findMissingGehen(forgotten, new Date("2026-06-09T20:00:00Z"))).toBeNull();
        });

        it("meldet nichts, wenn die Folge mit gehen endet", () => {
            expect(findMissingGehen(workday, new Date("2026-06-12T09:00:00Z"))).toBeNull();
        });

        it("meldet nichts ohne Buchungen", () => {
            expect(findMissingGehen([], new Date("2026-06-10T09:00:00Z"))).toBeNull();
        });
    });
});

describe("findPartner", () => {
    it("findet zum kommen das folgende gehen und zum gehen das kommen davor", () => {
        const shuffled = [workday[2], workday[0], workday[3], workday[1]]; // Reihenfolge egal
        expect(findPartner(shuffled, "3")?.id).toBe("4");
        expect(findPartner(shuffled, "2")?.id).toBe("1");
    });

    it("liefert null ohne Gegenstück oder bei unbekannter ID", () => {
        expect(findPartner(workday.slice(0, 3), "3")).toBeNull(); // laufendes kommen
        expect(findPartner(workday, "x")).toBeNull();
    });
});

describe("firstBookingDay", () => {
    it("liefert den lokalen Tag der frühesten Buchung, unabhängig von der Reihenfolge", () => {
        const late = b("x", "kommen", "2026-06-09T22:30:00Z"); // 10.06. 00:30 in Berlin
        expect(firstBookingDay([workday[2], late, workday[0]])).toBe("2026-06-10");
    });

    it("liefert null ohne Buchungen", () => {
        expect(firstBookingDay([])).toBeNull();
    });
});
