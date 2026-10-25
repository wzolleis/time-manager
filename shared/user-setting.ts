import {z} from "zod";
import {createSelectSchema} from "drizzle-zod";
import {userSettings, userSettingValues} from "../db/schema";
import {isValidDay} from "./day-range";

// Fest vorgegebene Einstellungen: stehen in der Tabelle user_settings (Migration 0014). Der Code verweist
// nur über die id auf sie. Die Defaults hier gelten nur, solange die Einstellungen noch nicht geladen sind.
export const SOLL_SETTING_ID = "fcf78946-28c3-4152-9abb-35af0c50cb8f"; // "Soll", Stunden pro Tag
export const VACATION_DAYS_SETTING_ID = "6fdfc98d-8096-4e64-92be-638b938929ed"; // "Urlaubstage" pro Jahr
export const DEFAULT_SOLL_HOURS = 8;
export const DEFAULT_VACATION_DAYS = 30;

const day = z.string().refine(isValidDay, "Ungültiges Datum (JJJJ-MM-TT)");
const value = z.string().trim().min(1, "Bitte einen Wert eingeben").max(100);

export const UserSettingSchema = createSelectSchema(userSettings);
export const UserSettingValueSchema = createSelectSchema(userSettingValues);

// Der User steht im Pfad der API. Ob Wert und Tag zur Einstellung passen, prüft checkSettingValue,
// damit eine Verletzung als 422 mit Meldung zurückkommt.
export const UserSettingValueCreateSchema = z.object({settingId: z.string().uuid(), value, validFrom: day});

// Die Einstellung eines Werts ändert sich nicht
export const UserSettingValueUpdateSchema = z.object({value: value.optional(), validFrom: day.optional()});

export type UserSetting = z.infer<typeof UserSettingSchema>;
export type UserSettingValue = z.infer<typeof UserSettingValueSchema>;
export type UserSettingValueCreate = z.infer<typeof UserSettingValueCreateSchema>;
export type UserSettingValueUpdate = z.infer<typeof UserSettingValueUpdateSchema>;

/** Antwort von GET /api/users/:userId/settings: alle Einstellungen und die Werte des Users */
export type UserSettingsData = {settings: UserSetting[]; values: UserSettingValue[]};
