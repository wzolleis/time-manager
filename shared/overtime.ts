import {z} from "zod";
import {createSelectSchema} from "drizzle-zod";
import {overtime} from "../db/schema";

export const OvertimeSchema = createSelectSchema(overtime);

// Der User steht im Pfad der API, created setzt der Server. Den Bereich (±23:59) prüft checkOffset,
// damit eine Verletzung als 422 mit Meldung zurückkommt.
export const OvertimeUpdateSchema = z.object({offset: z.number().int()});

export type Overtime = z.infer<typeof OvertimeSchema>;
export type OvertimeUpdate = z.infer<typeof OvertimeUpdateSchema>;
