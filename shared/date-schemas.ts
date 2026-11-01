// shared/date-schemas.ts
// Schemas für Tage, Uhrzeiten, Monate und Jahre als Text, wie DB, API, URL und MCP sie verwenden.
// Ohne Import aus day-range.ts oder week.ts, damit die beiden ihre Prüfungen von hier nehmen können.
import {z} from "zod";

const FIRST_YEAR = 1970;

/**
 * Ein echtes Kalenderdatum "JJJJ-MM-TT" ab 1970: 2026-02-30 ist ungültig, Schaltjahre zählen mit.
 * Die Untergrenze wie beim Jahr fängt Tippfehler wie "0026-06-10" ab.
 */
export const DaySchema = z.iso
    .date("Ungültiges Datum (JJJJ-MM-TT)")
    .refine((day) => Number(day.slice(0, 4)) >= FIRST_YEAR, "Ungültiges Datum (JJJJ-MM-TT)");

/** Uhrzeit "HH:mm": Stunde 00–23, Minute 00–59, immer zweistellig (kein "8:00", kein "24:00", keine Sekunden) */
export const TimeOfDaySchema = z.iso.time({precision: -1, message: "Uhrzeit als HH:mm"});

/** Monat "JJJJ-MM" mit Monat 01 bis 12 */
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Monat als JJJJ-MM");

/** Jahr als vierstelliger Text "JJJJ", ab 1970 */
export const YearSchema = z
    .string()
    .regex(/^\d{4}$/, "Jahr als JJJJ, ab 1970")
    .refine((year) => Number(year) >= FIRST_YEAR, "Jahr als JJJJ, ab 1970");
