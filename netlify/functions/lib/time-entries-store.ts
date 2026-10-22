// netlify/functions/lib/time-entries-store.ts
// Lesen und Schreiben der Buchungen mit den Regeln aus shared/time-rules.ts. Die REST-API
// (time-entries.ts) und der MCP-Server (mcp.ts) nutzen dieselben Funktionen, damit es die Regeln nur
// einmal gibt. Wer auf eine Buchung zugreifen darf, entscheidet der Aufrufer mit authorize.
import {randomUUID} from "node:crypto";
import {and, asc, eq, gte, inArray, lt} from "drizzle-orm";
import {db} from "./db";
import {timeEntries, timeEntryProjects} from "../../../db/schema";
import type {TimeEntryCreate, TimeEntryUpdate} from "../../../shared/time-entry";
import {type Booking, checkProject, checkSequence, findPartner} from "../../../shared/time-rules";
import {RuleError} from "./rule-error";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = Pick<typeof db, "select">;

/** Die Buchung gibt es nicht. Die Function antwortet darauf mit notFound(). */
export class NotFoundError extends Error {}

/**
 * Prüft den Zugriff auf die Buchungen eines Users, wirft bei Verbot (ForbiddenError, NotFoundError).
 * Läuft in der Transaktion und muss für eigene Abfragen ex verwenden, nicht db (eine Verbindung im Pool).
 */
export type Authorize = (ownerId: string, ex: Executor) => Promise<void> | void;

export type StoredEntry = {
    id: string;
    userId: string;
    type: Booking["type"];
    bookedAt: Date;
    projectId: string | null; // null, wenn kein Projekt zugeordnet ist
};

const entryColumns = {
    id: timeEntries.id,
    userId: timeEntries.userId,
    type: timeEntries.type,
    bookedAt: timeEntries.bookedAt,
    projectId: timeEntryProjects.projectId,
};

const selectEntries = (ex: Executor) =>
    ex
        .select(entryColumns)
        .from(timeEntries)
        .leftJoin(timeEntryProjects, eq(timeEntryProjects.timeEntryId, timeEntries.id));

export const getEntry = async (id: string, ex: Executor = db): Promise<StoredEntry | null> => {
    const [row] = await selectEntries(ex).where(eq(timeEntries.id, id)).limit(1);
    return row ?? null;
};

// Alle Buchungen eines Users, für die Dauer der Transaktion gesperrt
const lockBookings = (tx: Tx, userId: string): Promise<Booking[]> =>
    tx
        .select({id: timeEntries.id, type: timeEntries.type, bookedAt: timeEntries.bookedAt})
        .from(timeEntries)
        .where(eq(timeEntries.userId, userId))
        .for("update");

const ensureValid = (bookings: Booking[]) => {
    const problem = checkSequence(bookings);
    if (problem) throw new RuleError(problem);
};

const ensureProject = (type: Booking["type"], projectId: string | null | undefined) => {
    const problem = checkProject(type, projectId);
    if (problem) throw new RuleError(problem);
};

const setProject = async (tx: Tx, entryId: string, projectId: string | null) => {
    await tx.delete(timeEntryProjects).where(eq(timeEntryProjects.timeEntryId, entryId));
    if (projectId) await tx.insert(timeEntryProjects).values({timeEntryId: entryId, projectId});
};

/** Buchungen eines Users nach Zeit sortiert, optional im Zeitraum [from, to) */
export const listEntries = (userId: string, range: {from?: Date; to?: Date} = {}): Promise<StoredEntry[]> =>
    selectEntries(db)
        .where(
            and(
                eq(timeEntries.userId, userId),
                range.from ? gte(timeEntries.bookedAt, range.from) : undefined,
                range.to ? lt(timeEntries.bookedAt, range.to) : undefined,
            ),
        )
        .orderBy(asc(timeEntries.bookedAt));

/** Legt eine Buchung des Users an, wenn Projekt und Abfolge stimmen (sonst RuleError) */
export async function createEntry(userId: string, input: TimeEntryCreate): Promise<StoredEntry> {
    ensureProject(input.type, input.projectId);
    const id = randomUUID();
    await db.transaction(async (tx) => {
        const existing = await lockBookings(tx, userId);
        ensureValid([...existing, {id, type: input.type, bookedAt: input.bookedAt}]);
        await tx.insert(timeEntries).values({id, userId, type: input.type, bookedAt: input.bookedAt});
        if (input.projectId) await setProject(tx, id, input.projectId);
    });
    return (await getEntry(id))!;
}

/** Ändert Zeit und/oder Projekt einer Buchung, der Typ bleibt */
export async function changeEntry(id: string, patch: TimeEntryUpdate, authorize: Authorize): Promise<StoredEntry> {
    const {projectId, ...fields} = patch;

    await db.transaction(async (tx) => {
        const current = await getEntry(id, tx);
        if (!current) throw new NotFoundError();
        await authorize(current.userId, tx);
        ensureProject(current.type, projectId);

        const existing = await lockBookings(tx, current.userId);
        const changed: Booking = {id, type: current.type, bookedAt: fields.bookedAt ?? current.bookedAt};
        ensureValid(existing.map((b) => (b.id === id ? changed : b)));

        if (Object.keys(fields).length > 0) {
            await tx.update(timeEntries).set(fields).where(eq(timeEntries.id, id));
        }
        if (projectId !== undefined) await setProject(tx, id, projectId);
    });
    return (await getEntry(id))!;
}

/** Löscht eine Buchung, mit pair zusammen mit ihrem Gegenstück. Ergebnis: die IDs der gelöschten Buchungen. */
export async function deleteEntry(id: string, pair: boolean, authorize: Authorize): Promise<string[]> {
    return db.transaction(async (tx) => {
        const current = await getEntry(id, tx);
        if (!current) throw new NotFoundError();
        await authorize(current.userId, tx);

        const existing = await lockBookings(tx, current.userId);
        const toDelete = new Set([id]);
        const partner = pair ? findPartner(existing, id) : null;
        if (partner) toDelete.add(partner.id);

        ensureValid(existing.filter((b) => !toDelete.has(b.id)));
        await tx.delete(timeEntries).where(inArray(timeEntries.id, [...toDelete]));
        return [...toDelete];
    });
}
