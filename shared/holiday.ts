import {z} from "zod";
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import {holidays} from "../db/schema";
import {DaySchema} from "./date-schemas";

const name = z.string().trim().min(1, "Bitte einen Namen angeben").max(100);

export const HolidaySchema = createSelectSchema(holidays, {date: DaySchema});

// Wem der Feiertag gehört, sagt der Pfad: /api/holidays für alle, /api/users/:userId/holidays für einen User
export const HolidayCreateSchema = createInsertSchema(holidays, {
    date: DaySchema,
    name,
}).omit({id: true, userId: true});

// Beim Update ersetzt eine Verfeinerung die Definition des Felds samt Optionalität,
// deshalb hier ausdrücklich .optional()
export const HolidayUpdateSchema = createUpdateSchema(holidays, {
    date: DaySchema.optional(),
    name: name.optional(),
}).omit({id: true, userId: true}); // aus einem eigenen Feiertag wird kein globaler und umgekehrt

export type Holiday = z.infer<typeof HolidaySchema>;
export type HolidayCreate = z.infer<typeof HolidayCreateSchema>;
export type HolidayUpdate = z.infer<typeof HolidayUpdateSchema>;
