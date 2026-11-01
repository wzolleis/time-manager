// shared/date-schemas.ts
// Tage, Uhrzeiten, Monate und Jahre als Text, wie DB, API, URL und MCP sie verwenden. Jeder Text bekommt einen
// eigenen Typ (Branded Type): Ein Day entsteht nur über DaySchema, parseDay, isValidDay oder die Helfer in
// day-range.ts und week.ts. So fällt beim Kompilieren auf, wenn ein Monat statt eines Tags übergeben wird.
// Ohne Import aus day-range.ts oder week.ts, damit die beiden ihre Prüfungen von hier nehmen können.
import {z} from "zod";

const FIRST_YEAR = 1970;

/**
 * Ein echtes Kalenderdatum "JJJJ-MM-TT" ab 1970: 2026-02-30 ist ungültig, Schaltjahre zählen mit.
 * Die Untergrenze wie beim Jahr fängt Tippfehler wie "0026-06-10" ab.
 */
export const DaySchema = z.iso
    .date("Ungültiges Datum (JJJJ-MM-TT)")
    .refine((day) => Number(day.slice(0, 4)) >= FIRST_YEAR, "Ungültiges Datum (JJJJ-MM-TT)")
    .brand<"Day">();

/** Uhrzeit "HH:mm": Stunde 00–23, Minute 00–59, immer zweistellig (kein "8:00", kein "24:00", keine Sekunden) */
export const TimeOfDaySchema = z.iso.time({precision: -1, message: "Uhrzeit als HH:mm"}).brand<"TimeOfDay">();

/** Monat "JJJJ-MM" mit Monat 01 bis 12 */
export const MonthSchema = z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Monat als JJJJ-MM")
    .brand<"Month">();

/** Jahr als vierstelliger Text "JJJJ", ab 1970 */
export const YearSchema = z
    .string()
    .regex(/^\d{4}$/, "Jahr als JJJJ, ab 1970")
    .refine((year) => Number(year) >= FIRST_YEAR, "Jahr als JJJJ, ab 1970")
    .brand<"Year">();

export type Day = z.infer<typeof DaySchema>;
export type TimeOfDay = z.infer<typeof TimeOfDaySchema>;
export type Month = z.infer<typeof MonthSchema>;
export type Year = z.infer<typeof YearSchema>;

/** Text als Tag, wirft bei einem ungültigen Datum. Für Texte, die sicher gültig sein müssen, z. B. in Tests. */
export const parseDay = (text: string): Day => DaySchema.parse(text);

/** Text als Tag oder null, z. B. für die Eingabe eines Formulars */
export const toDay = (text: string): Day | null => {
    const result = DaySchema.safeParse(text);
    return result.success ? result.data : null;
};
export const parseTimeOfDay = (text: string): TimeOfDay => TimeOfDaySchema.parse(text);

/** Text als Uhrzeit oder null, z. B. für die Eingabe eines Formulars */
export const toTimeOfDay = (text: string): TimeOfDay | null => {
    const result = TimeOfDaySchema.safeParse(text);
    return result.success ? result.data : null;
};
export const parseMonth = (text: string): Month => MonthSchema.parse(text);
export const parseYear = (text: string): Year => YearSchema.parse(text);
