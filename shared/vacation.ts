import {z} from "zod";
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import {vacations} from "../db/schema";
import {DaySchema} from "./date-schemas";
import {checkRange} from "./vacation-rules";

export const VacationSchema = createSelectSchema(vacations);

// Der User steht im Pfad der API, nicht im Body
export const VacationCreateSchema = createInsertSchema(vacations, {
    startDate: DaySchema,
    endDate: DaySchema,
})
    .omit({id: true, userId: true})
    .superRefine((v, ctx) => {
        const problem = checkRange(v.startDate, v.endDate);
        if (problem) ctx.addIssue({code: "custom", message: problem, path: ["endDate"]});
    });

// Beim Update ersetzt eine Verfeinerung die Definition des Felds samt Optionalität,
// deshalb hier ausdrücklich .optional()
export const VacationUpdateSchema = createUpdateSchema(vacations, {
    startDate: DaySchema.optional(),
    endDate: DaySchema.optional(),
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
