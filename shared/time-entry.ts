// shared/time-entry.ts
import {z} from "zod";
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import {projects, timeEntries} from "../db/schema";

const createRefine = {bookedAt: z.coerce.date()};
const updateRefine = {bookedAt: z.coerce.date().optional()};

export const ProjectSchema = createSelectSchema(projects);
export const ProjectCreateSchema = createInsertSchema(projects, {
    name: (s) => s.trim().min(1).max(100),
}).omit({id: true});
export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const TimeEntrySchema = createSelectSchema(timeEntries).extend({
    projectId: z.uuid().nullable(), // aus der Zuordnungstabelle, kommt per Join
});

export const TimeEntryCreateSchema = createInsertSchema(timeEntries, createRefine)
    .omit({id: true})
    .extend({projectId: z.uuid().nullish()});

export const TimeEntryUpdateSchema = createUpdateSchema(timeEntries, updateRefine)
    .omit({id: true, userId: true}) // die Buchung wandert nicht zu einem anderen User
    .extend({projectId: z.uuid().nullish()});

export type Project = z.infer<typeof ProjectSchema>;
export type TimeEntry = z.infer<typeof TimeEntrySchema>;
export type TimeEntryCreate = z.infer<typeof TimeEntryCreateSchema>;
export type TimeEntryUpdate = z.infer<typeof TimeEntryUpdateSchema>;