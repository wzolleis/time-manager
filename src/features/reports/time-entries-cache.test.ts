import {describe, expect, it} from "vitest";
import type {TimeEntryDto} from "@/api/time-entries";
import {isOptimistic, optimisticId, withAdded, withChanged, withRemoved} from "./time-entries-cache";

const entry = (id: string, type: "kommen" | "gehen", bookedAt: string): TimeEntryDto => ({
    id,
    userId: "u1",
    type,
    bookedAt,
    projectId: null,
});

const ENTRIES = [
    entry("k1", "kommen", "2026-10-14T06:00:00.000Z"),
    entry("g1", "gehen", "2026-10-14T10:00:00.000Z"),
    entry("k2", "kommen", "2026-10-14T11:00:00.000Z"),
    entry("g2", "gehen", "2026-10-14T15:00:00.000Z"),
];

const ids = (list: TimeEntryDto[]) => list.map((e) => e.id);

describe("optimisticId", () => {
    it("ist vorläufig, eine Id vom Server nicht", () => {
        expect(isOptimistic(optimisticId())).toBe(true);
        expect(isOptimistic("275f12fb-e116-4857-9f12-fbe116b857fb")).toBe(false);
    });
});

describe("withAdded", () => {
    it("sortiert die neue Buchung nach Zeit ein", () => {
        const added = entry("neu", "kommen", "2026-10-13T06:00:00.000Z");
        expect(ids(withAdded(ENTRIES, added))).toEqual(["neu", "k1", "g1", "k2", "g2"]);
    });

    it("ändert die übergebene Liste nicht", () => {
        withAdded(ENTRIES, entry("neu", "kommen", "2026-10-13T06:00:00.000Z"));
        expect(ids(ENTRIES)).toEqual(["k1", "g1", "k2", "g2"]);
    });
});

describe("withChanged", () => {
    it("ändert Uhrzeit und sortiert neu", () => {
        const changed = withChanged(ENTRIES, "k2", {bookedAt: "2026-10-14T05:00:00.000Z"});
        expect(ids(changed)).toEqual(["k2", "k1", "g1", "g2"]);
        expect(changed[0].bookedAt).toBe("2026-10-14T05:00:00.000Z");
    });

    it("ändert nur das Projekt", () => {
        const changed = withChanged(ENTRIES, "k1", {projectId: "p1"});
        expect(changed[0]).toEqual({...ENTRIES[0], projectId: "p1"});
        expect(changed[2]).toBe(ENTRIES[2]);
    });
});

describe("withRemoved", () => {
    it("löscht nur die Buchung", () => {
        expect(ids(withRemoved(ENTRIES, "g1", false))).toEqual(["k1", "k2", "g2"]);
    });

    it("löscht ein Kommen mit dem folgenden Gehen", () => {
        expect(ids(withRemoved(ENTRIES, "k2", true))).toEqual(["k1", "g1"]);
    });

    it("löscht ein Gehen mit dem vorhergehenden Kommen", () => {
        expect(ids(withRemoved(ENTRIES, "g1", true))).toEqual(["k2", "g2"]);
    });
});
