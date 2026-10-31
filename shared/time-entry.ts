// shared/time-entry.ts
import {z} from "zod";
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import {timeEntries} from "../db/schema";
import {isValidDay} from "./day-range";

const createRefine = {bookedAt: z.coerce.date()};
const updateRefine = {bookedAt: z.coerce.date().optional()};

export const TimeEntrySchema = createSelectSchema(timeEntries).extend({
    projectId: z.uuid().nullable(), // aus der Zuordnungstabelle, kommt per Join
});

// Der User steht im Pfad der API, nicht im Body
export const TimeEntryCreateSchema = createInsertSchema(timeEntries, createRefine)
    .omit({id: true, userId: true})
    .extend({projectId: z.uuid().nullish()});

export const TimeEntryUpdateSchema = createUpdateSchema(timeEntries, updateRefine)
    // Die Buchung wandert nicht zu einem anderen User, ein anderer Typ würde die Abfolge zerstören
    .omit({id: true, userId: true, type: true})
    .extend({projectId: z.uuid().nullish()});

// Uhrzeit "HH:mm": Stunde 00–23, Minute 00–59, immer zweistellig (kein "8:00", kein "24:00")
export const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit als HH:mm");

// Ein Zeitraum: die Buchungen berechnet der Server aus Arbeitszeit, Beginn und den Buchungen des Tages (planWorkDay)
export const TimeEntryDayCreateSchema = z.object({
    day: z.string().refine(isValidDay, "Tag als JJJJ-MM-TT"),
    start: TimeOfDaySchema.optional(), // ohne: 08:00 am leeren Tag, sonst so früh wie möglich
    workMinutes: z.number().int().positive(),
    projectId: z.uuid().nullish(),
});

export type TimeEntry = z.infer<typeof TimeEntrySchema>;
export type TimeEntryCreate = z.infer<typeof TimeEntryCreateSchema>;
export type TimeEntryUpdate = z.infer<typeof TimeEntryUpdateSchema>;
export type TimeEntryDayCreate = z.infer<typeof TimeEntryDayCreateSchema>;
