import {z} from "zod";
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import {vacations} from "../db/schema";
import {isValidDay} from "./day-range";
import {checkRange} from "./vacation-rules";

const day = z.string().refine(isValidDay, "Ungültiges Datum (JJJJ-MM-TT)");

export const VacationSchema = createSelectSchema(vacations);

export const VacationCreateSchema = createInsertSchema(vacations, {
    startDate: day,
    endDate: day,
})
    .omit({id: true})
    .superRefine((v, ctx) => {
        const problem = checkRange(v.startDate, v.endDate);
        if (problem) ctx.addIssue({code: "custom", message: problem, path: ["endDate"]});
    });

// Beim Update ersetzt eine Verfeinerung die Definition des Felds samt Optionalität,
// deshalb hier ausdrücklich .optional()
export const VacationUpdateSchema = createUpdateSchema(vacations, {
    startDate: day.optional(),
    endDate: day.optional(),
})
    .omit({id: true, userId: true}) // ein Urlaub wandert nicht zu einem anderen User
    .superRefine((v, ctx) => {
        // Nur prüfbar, wenn beide Daten gesendet wurden. Sonst prüft die Function gegen den gespeicherten Wert.
        if (v.startDate && v.endDate) {
            const problem = checkRange(v.startDate, v.endDate);
            if (problem) ctx.addIssue({code: "custom", message: problem, path: ["endDate"]});
        }
    });

export type Vacation = z.infer<typeof VacationSchema>;
export type VacationCreate = z.infer<typeof VacationCreateSchema>;
export type VacationUpdate = z.infer<typeof VacationUpdateSchema>;
