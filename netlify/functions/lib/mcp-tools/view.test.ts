import {describe, expect, it} from "vitest";
import {formatDifference} from "../../../../shared/format";
import {RuleError} from "../rule-error";
import {NotFoundError} from "../time-entries-store";
import {type EntryView, errorResult, localIso, mdTable, minutes, workDayText} from "./view";

const MIN = 60_000;

describe("minutes", () => {
    it("rundet den Betrag ab wie formatDifference, damit Zahl und Text zusammenpassen", () => {
        expect(minutes(245 * MIN + 30_000)).toBe(245);
        expect(minutes(-(245 * MIN + 30_000))).toBe(-245);
        expect(formatDifference(-(245 * MIN + 30_000))).toBe("−4 Std 5 Min");
    });

    it("gibt unter einer Minute 0, nicht -0", () => {
        expect(Object.is(minutes(-30_000), 0)).toBe(true);
    });
});

describe("localIso", () => {
    it("zeigt Berliner Zeit mit dem Offset von Sommer- und Winterzeit", () => {
        expect(localIso(new Date("2026-10-19T06:00:00Z"))).toBe("2026-10-19T08:00:00+02:00");
        expect(localIso(new Date("2026-12-01T07:30:15Z"))).toBe("2026-12-01T08:30:15+01:00");
    });

    it("stimmt am Tag der Umstellung vor und nach 3 Uhr", () => {
        expect(localIso(new Date("2026-10-25T00:30:00Z"))).toBe("2026-10-25T02:30:00+02:00");
        expect(localIso(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-25T02:30:00+01:00");
    });
});

describe("mdTable", () => {
    it("baut Kopf, Trennzeile und Zeilen und maskiert | im Inhalt", () => {
        expect(mdTable(["Projekt", "ID"], [["A|B", "1"]])).toBe(
            ["| Projekt | ID |", "| --- | --- |", "| A\\|B | 1 |"].join("\n"),
        );
    });
});

describe("errorResult", () => {
    it("gibt eine verletzte Regel als Ergebnis mit isError und der Meldung zurück", () => {
        expect(errorResult(new RuleError('Um 09:00 fehlt vorher ein "gehen"'))).toEqual({
            content: [{type: "text", text: 'Um 09:00 fehlt vorher ein "gehen"'}],
            isError: true,
        });
    });

    it("meldet eine unbekannte oder fremde Buchung als nicht gefunden", () => {
        expect(errorResult(new NotFoundError()).content).toEqual([{type: "text", text: "Buchung nicht gefunden"}]);
    });

    it("gibt unerwartete Fehler nicht im Wortlaut weiter", () => {
        const log = console.error;
        console.error = () => {};
        try {
            expect(errorResult(new Error("Access denied for user 'x'@'host'")).content).toEqual([
                {type: "text", text: "Interner Fehler"},
            ]);
        } finally {
            console.error = log;
        }
    });
});

describe("workDayText", () => {
    // Buchung am 26.10.2026 (Winterzeit, +01:00) zur Uhrzeit HH:mm
    const at = (type: EntryView["type"], time: string, projectName: string | null = null): EntryView => ({
        id: time,
        type,
        day: "2026-10-26",
        time,
        bookedAt: `2026-10-26T${time}:00+01:00`,
        projectId: projectName ? "p1" : null,
        projectName: type === "kommen" ? projectName : null,
    });

    it("nennt ein Paar ohne Pause", () => {
        expect(workDayText([at("kommen", "08:00"), at("gehen", "12:00")])).toBe(
            "am Mo., 26.10.: 08:00–12:00 (4 Std Arbeit, ohne Pause)",
        );
    });

    it("nennt zwei Paare mit 30 Minuten Pause und das Projekt", () => {
        const entries = [
            at("kommen", "08:00", "Alpha"),
            at("gehen", "14:00"),
            at("kommen", "14:30", "Alpha"),
            at("gehen", "16:30"),
        ];
        expect(workDayText(entries)).toBe(
            "am Mo., 26.10.: 08:00–14:00, 14:30–16:30 (8 Std Arbeit, 30 Min Pause, Alpha)",
        );
    });

    it("nennt 45 Minuten Pause", () => {
        const entries = [at("kommen", "08:00"), at("gehen", "14:00"), at("kommen", "14:45"), at("gehen", "18:45")];
        expect(workDayText(entries)).toBe("am Mo., 26.10.: 08:00–14:00, 14:45–18:45 (10 Std Arbeit, 45 Min Pause)");
    });
});
