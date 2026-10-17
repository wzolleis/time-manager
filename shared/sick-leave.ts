import {z} from "zod";
import {createInsertSchema, createSelectSchema, createUpdateSchema} from "drizzle-zod";
import {sickLeaves} from "../db/schema";
import {isValidDay} from "./day-range";
import {checkRange} from "./vacation-rules";

const day = z.string().refine(isValidDay, "Ungültiges Datum (JJJJ-MM-TT)");
const note = z.string().max(500, "Die Notiz darf höchstens 500 Zeichen lang sein").nullable();
const RANGE_LABEL = "Eine Krankmeldung";

export const SickLeaveSchema = createSelectSchema(sickLeaves);

export const SickLeaveCreateSchema = createInsertSchema(sickLeaves, {
    startDate: day,
    endDate: day,
    note: note.optional(),
})
    .omit({id: true})
    .superRefine((v, ctx) => {
        const problem = checkRange(v.startDate, v.endDate, RANGE_LABEL);
        if (problem) ctx.addIssue({code: "custom", message: problem, path: ["endDate"]});
    });

// Beim Update ersetzt eine Verfeinerung die Definition des Felds samt Optionalität,
// deshalb hier ausdrücklich .optional()
export const SickLeaveUpdateSchema = createUpdateSchema(sickLeaves, {
    startDate: day.optional(),
    endDate: day.optional(),
    note: note.optional(),
})
    .omit({id: true, userId: true}) // eine Krankmeldung wandert nicht zu einem anderen User
    .superRefine((v, ctx) => {
        // Nur prüfbar, wenn beide Daten gesendet wurden. Sonst prüft die Function gegen den gespeicherten Wert.
        if (v.startDate && v.endDate) {
            const problem = checkRange(v.startDate, v.endDate, RANGE_LABEL);
            if (problem) ctx.addIssue({code: "custom", message: problem, path: ["endDate"]});
        }
    });

export type SickLeave = z.infer<typeof SickLeaveSchema>;
export type SickLeaveCreate = z.infer<typeof SickLeaveCreateSchema>;
export type SickLeaveUpdate = z.infer<typeof SickLeaveUpdateSchema>;
