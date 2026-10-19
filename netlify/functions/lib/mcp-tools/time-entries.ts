// netlify/functions/lib/mcp-tools/time-entries.ts
// Tools der Zeiterfassung: stempeln, Buchungen auflisten, nachtragen, ändern und löschen. Die Regeln
// prüft lib/time-entries-store.ts wie bei der REST-API (Regel 1).
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {formatTime} from "../../../../shared/format";
import {addDays, isValidDay, localTimeToUtc, startOfLocalDay} from "../../../../shared/day-range";
import {isSickDay, sickDayMessage} from "../../../../shared/sick-leave-rules";
import type {TimeEntryUpdate} from "../../../../shared/time-entry";
import {findMissingGehen, localDay} from "../../../../shared/time-rules";
import type {SessionUser} from "../session";
import {
    type Authorize,
    changeEntry,
    createEntry,
    deleteEntry,
    getEntry,
    listEntries,
    NotFoundError,
    type StoredEntry,
} from "../time-entries-store";
import {loadProjectNames, loadProjects, loadSickLeaves} from "./data";
import {dayShort, EntrySchema, entryText, entryView, fail, mdTable, NOT_FOUND, ok, run, typeLabel} from "./view";

export const DaySchema = z.string().refine(isValidDay, "Tag als JJJJ-MM-TT");
const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit als HH:mm");
const TypeSchema = z.enum(["kommen", "gehen"]);
const ProjectIdSchema = z.uuid().describe("ID aus list_projects, nur beim Kommen");

const EntryResultSchema = {
    entry: EntrySchema,
    sickNotice: z.string().nullable().describe("Hinweis, wenn der Tag ein Krankheitstag ist"),
};

// Eine fremde Buchung wird wie eine unbekannte behandelt (Regel 3)
const ownOnly =
    (user: SessionUser): Authorize =>
    (ownerId) => {
        if (ownerId !== user.id) throw new NotFoundError();
    };

/** Die gespeicherte Buchung als Ergebnis, mit dem Hinweis an Krankheitstagen (Regel 5) */
async function entryResult(entry: StoredEntry, verb: string) {
    const view = entryView(entry, await loadProjectNames());
    const sickNotice = isSickDay(view.day, await loadSickLeaves(entry.userId)) ? sickDayMessage(view.day) : null;
    const text = [`${verb}: ${entryText(view)}.`, sickNotice].filter(Boolean).join("\n");
    return ok(text, {entry: view, sickNotice});
}

export function registerTimeEntryTools(server: McpServer, user: SessionUser): void {
    const authorize = ownOnly(user);

    server.registerTool(
        "get_stamp_status",
        {
            title: "Stempelstatus",
            description:
                "Zeigt, ob der User gerade eingestempelt ist, seit wann und für welches Projekt, und ob an einem " +
                "früheren Tag das Gehen fehlt. Vor stamp aufrufen, wenn unklar ist, ob Kommen oder Gehen dran ist.",
            outputSchema: {
                stampedIn: z.boolean().describe("die letzte Buchung ist ein Kommen von heute"),
                last: EntrySchema.nullable().describe("die letzte Buchung"),
                missingGehen: EntrySchema.nullable().describe(
                    "Kommen eines früheren Tages ohne Gehen: zuerst das Gehen mit add_time_entry nachtragen",
                ),
                next: TypeSchema.describe("welche Buchung als Nächstes dran ist"),
                sickNotice: z.string().nullable().describe("Hinweis, wenn heute ein Krankheitstag ist"),
            },
            annotations: {readOnlyHint: true},
        },
        () =>
            run(async () => {
                const now = new Date();
                const today = localDay(now);
                const entries = await listEntries(user.id);
                const names = await loadProjectNames();
                const lastEntry = entries.at(-1);
                const missingId = findMissingGehen(entries, now)?.id;
                const missingEntry = entries.find((e) => e.id === missingId);
                const last = lastEntry ? entryView(lastEntry, names) : null;
                const missingGehen = missingEntry ? entryView(missingEntry, names) : null;
                const stampedIn = last?.type === "kommen" && !missingGehen;
                const sickNotice = isSickDay(today, await loadSickLeaves(user.id)) ? sickDayMessage(today) : null;

                const status = missingGehen
                    ? `Zum Kommen am ${dayShort(missingGehen.day)} um ${missingGehen.time} fehlt das Gehen. ` +
                      "Erst das Gehen nachtragen, dann wieder stempeln."
                    : stampedIn
                      ? `Eingestempelt seit ${last!.time}${last!.projectName ? ` für ${last!.projectName}` : ""}.`
                      : last
                        ? `Ausgestempelt, zuletzt ${entryText(last)}.`
                        : "Noch keine Buchung.";
                return ok([status, sickNotice].filter(Boolean).join("\n"), {
                    stampedIn,
                    last,
                    missingGehen,
                    next: last?.type === "kommen" ? "gehen" : "kommen",
                    sickNotice,
                });
            }),
    );

    server.registerTool(
        "stamp",
        {
            title: "Stempeln",
            description:
                "Bucht jetzt ein Kommen oder Gehen. Der Typ ist Pflicht: Vorher get_stamp_status aufrufen, wenn " +
                "unklar ist, ob Kommen oder Gehen dran ist. Passt der Typ nicht zur letzten Buchung, scheitert der " +
                "Aufruf; dann die Meldung dem User zeigen und nachfragen, nicht den Typ wechseln. Ein Projekt gibt " +
                "es nur beim Kommen.",
            inputSchema: {type: TypeSchema, projectId: ProjectIdSchema.optional()},
            outputSchema: EntryResultSchema,
            annotations: {destructiveHint: false},
        },
        ({type, projectId}) =>
            run(async () => {
                const entry = await createEntry({userId: user.id, type, bookedAt: new Date(), projectId});
                return entryResult(entry, "Gebucht");
            }),
    );

    server.registerTool(
        "list_projects",
        {
            title: "Projekte",
            description: "Listet die Projekte mit id und name. Die id braucht stamp und add_time_entry beim Kommen.",
            outputSchema: {projects: z.array(z.object({id: z.string(), name: z.string()}))},
            annotations: {readOnlyHint: true},
        },
        () =>
            run(async () => {
                const projects = (await loadProjects()).map(({id, name}) => ({id, name}));
                const text = projects.length
                    ? mdTable(
                          ["Projekt", "ID"],
                          projects.map((p) => [p.name, p.id]),
                      )
                    : "Keine Projekte.";
                return ok(text, {projects});
            }),
    );

    server.registerTool(
        "list_time_entries",
        {
            title: "Buchungen",
            description:
                "Listet die Buchungen des Users von from bis to (beide Tage eingeschlossen) mit Projektname und id. " +
                "Die id braucht change_time_entry und delete_time_entry.",
            inputSchema: {from: DaySchema, to: DaySchema},
            outputSchema: {entries: z.array(EntrySchema)},
            annotations: {readOnlyHint: true},
        },
        ({from, to}) =>
            run(async () => {
                if (to < from) return fail("to liegt vor from");
                const rows = await listEntries(user.id, {
                    from: startOfLocalDay(from),
                    to: startOfLocalDay(addDays(to, 1)),
                });
                const names = await loadProjectNames();
                const entries = rows.map((e) => entryView(e, names));
                const text = entries.length
                    ? mdTable(
                          ["Tag", "Uhrzeit", "Buchung", "Projekt", "ID"],
                          entries.map((e) => [dayShort(e.day), e.time, typeLabel(e.type), e.projectName ?? "–", e.id]),
                      )
                    : "Keine Buchungen in diesem Zeitraum.";
                return ok(text, {entries});
            }),
    );

    server.registerTool(
        "add_time_entry",
        {
            title: "Buchung nachtragen",
            description:
                "Trägt eine vergessene Buchung nach, z. B. ein fehlendes Gehen von gestern. Tag und Uhrzeit in " +
                "Berliner Zeit. Die Abfolge Kommen, Gehen, Kommen … muss danach stimmen, sonst scheitert der Aufruf " +
                "mit einer Meldung. Ein Projekt gibt es nur beim Kommen.",
            inputSchema: {
                type: TypeSchema,
                day: DaySchema.describe("Tag JJJJ-MM-TT"),
                time: TimeSchema.describe("Uhrzeit HH:mm"),
                projectId: ProjectIdSchema.optional(),
            },
            outputSchema: EntryResultSchema,
            annotations: {destructiveHint: false},
        },
        ({type, day, time, projectId}) =>
            run(async () => {
                const entry = await createEntry({
                    userId: user.id,
                    type,
                    bookedAt: localTimeToUtc(day, time),
                    projectId,
                });
                return entryResult(entry, "Nachgetragen");
            }),
    );

    server.registerTool(
        "change_time_entry",
        {
            title: "Buchung ändern",
            description:
                "Ändert die Uhrzeit (am selben Tag) und/oder das Projekt einer Buchung. Typ und Tag bleiben. " +
                "projectId null entfernt das Projekt. Die Abfolge muss danach stimmen, sonst scheitert der Aufruf.",
            inputSchema: {
                id: z.uuid().describe("ID der Buchung"),
                time: TimeSchema.optional().describe("neue Uhrzeit HH:mm"),
                projectId: ProjectIdSchema.nullable().optional(),
            },
            outputSchema: EntryResultSchema,
        },
        ({id, time, projectId}) =>
            run(async () => {
                if (time === undefined && projectId === undefined) return fail("Bitte time oder projectId angeben");
                const current = await getEntry(id);
                if (!current || current.userId !== user.id) return fail(NOT_FOUND);

                const patch: TimeEntryUpdate = {};
                // Unveränderte Uhrzeit nicht senden, damit die Sekunden der Buchung erhalten bleiben (wie in der UI)
                if (time !== undefined && time !== formatTime(current.bookedAt)) {
                    patch.bookedAt = localTimeToUtc(localDay(current.bookedAt), time);
                }
                if (projectId !== undefined) patch.projectId = projectId;

                const entry = Object.keys(patch).length ? await changeEntry(id, patch, authorize) : current;
                return entryResult(entry, "Geändert");
            }),
    );

    server.registerTool(
        "delete_time_entry",
        {
            title: "Buchung löschen",
            description:
                "Löscht genau eine Buchung, nie ihr Gegenstück. Würde die Abfolge danach nicht mehr stimmen, " +
                "scheitert der Aufruf und nichts wird gelöscht. Ein Paar löscht man in zwei Aufrufen: erst das " +
                "Gehen, dann das Kommen.",
            inputSchema: {id: z.uuid().describe("ID der Buchung")},
            outputSchema: {deletedId: z.string()},
            annotations: {destructiveHint: true},
        },
        ({id}) =>
            run(async () => {
                const current = await getEntry(id);
                if (!current || current.userId !== user.id) return fail(NOT_FOUND);
                await deleteEntry(id, false, authorize);
                const view = entryView(current, await loadProjectNames());
                return ok(`Gelöscht: ${entryText(view)}.`, {deletedId: id});
            }),
    );
}
