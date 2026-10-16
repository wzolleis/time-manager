// shared/user.ts
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import type {z} from "zod";
import {projects} from "../db/schema";

// Was in der DB steht (Antworten der API): bewusst locker, nur Typen aus der Tabelle
export const ProjectSchema = createSelectSchema(projects);

// Was wir von außen annehmen: strenger. Die id vergibt der Server.
const refine = {
    name: (s: z.ZodString) => s.trim().min(1).max(100),
};

export const ProjectCreateSchema = createInsertSchema(projects, refine).omit({id: true});
export const ProjectUpdateSchema = createUpdateSchema(projects, refine).omit({id: true});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
