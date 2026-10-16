import {z} from "zod";
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import {holidays} from "../db/schema";
import {isValidDay} from "./day-range";

const day = z.string().refine(isValidDay, "Ungültiges Datum (JJJJ-MM-TT)");
const name = z.string().trim().min(1, "Bitte einen Namen angeben").max(100);

export const HolidaySchema = createSelectSchema(holidays);

// userId muss ausdrücklich gesendet werden (null = für alle), damit ein vergessenes Feld
// nicht versehentlich einen globalen Feiertag anlegt
export const HolidayCreateSchema = createInsertSchema(holidays, {
    userId: z.string().uuid().nullable(),
    date: day,
    name,
}).omit({id: true});

// Beim Update ersetzt eine Verfeinerung die Definition des Felds samt Optionalität,
// deshalb hier ausdrücklich .optional()
export const HolidayUpdateSchema = createUpdateSchema(holidays, {
    date: day.optional(),
    name: name.optional(),
}).omit({id: true, userId: true}); // aus einem eigenen Feiertag wird kein globaler und umgekehrt

export type Holiday = z.infer<typeof HolidaySchema>;
export type HolidayCreate = z.infer<typeof HolidayCreateSchema>;
export type HolidayUpdate = z.infer<typeof HolidayUpdateSchema>;
