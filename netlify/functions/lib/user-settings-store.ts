// netlify/functions/lib/user-settings-store.ts
// Lesen und Schreiben der Einstellungen eines Users, gemeinsam für die REST-API und den MCP-Server
import {randomUUID} from "node:crypto";
import {and, asc, eq} from "drizzle-orm";
import {db} from "./db";
import {userSettings, userSettingValues} from "../../../db/schema";
import {localDay} from "@shared/time-rules";
import type {UserSettingsData, UserSettingValueCreate, UserSettingValueUpdate} from "@shared/user-setting";
import {
    checkChange,
    checkDelete,
    checkImmediateEdit,
    checkSettingValue,
    historyOf,
    isImmediate,
    type SettingHistory,
} from "@shared/user-setting-rules";
import {RuleError} from "./rule-error";
import {lockUser} from "./lock-user";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

export class SettingNotFoundError extends Error {}

/** Einstellungen nach Namen, die Werte des Users nach Einstellung und Tag */
export async function listUserSettings(userId: string, ex: Executor = db): Promise<UserSettingsData> {
    const settings = await ex.select().from(userSettings).orderBy(asc(userSettings.name));
    const values = await ex
        .select()
        .from(userSettingValues)
        .where(eq(userSettingValues.userId, userId))
        .orderBy(asc(userSettingValues.settingId), asc(userSettingValues.validFrom));
    return {settings, values};
}

/** Die History einer Einstellung des Users, für die Berechnungen */
export const loadSettingHistory = async (
    userId: string,
    settingId: string,
    ex: Executor = db,
): Promise<SettingHistory> => historyOf(await listUserSettings(userId, ex), settingId);

const getValue = async (ex: Executor, id: string) => {
    const [row] = await ex.select().from(userSettingValues).where(eq(userSettingValues.id, id)).limit(1);
    return row ?? null;
};

const getSetting = async (ex: Executor, id: string) => {
    const [row] = await ex.select().from(userSettings).where(eq(userSettings.id, id)).limit(1);
    return row ?? null;
};

const valuesOf = (tx: Tx, userId: string, settingId: string) =>
    tx
        .select()
        .from(userSettingValues)
        .where(and(eq(userSettingValues.userId, userId), eq(userSettingValues.settingId, settingId)));

const today = () => localDay(new Date());

/**
 * Legt einen neuen Wert an (Regeln 3 bis 6) und liefert ihn zurück. Bei einer Einstellung ohne Historie
 * (immediately) wird der vorhandene Wert des Users überschrieben, er gilt ab heute.
 */
export async function addSettingValue(userId: string, input: UserSettingValueCreate) {
    let id: string = randomUUID();
    await db.transaction(async (tx) => {
        // Damit zwei Werte nicht gleichzeitig als "erster eigener Wert" rückwirkend eingetragen werden (Regel 3)
        await lockUser(tx, userId);
        const setting = await getSetting(tx, input.settingId);
        if (!setting) throw new SettingNotFoundError();
        const history = historyOf({settings: [setting], values: await valuesOf(tx, userId, setting.id)}, setting.id);
        const problem = checkSettingValue(setting, history.values, input, today());
        if (problem) throw new RuleError(problem);
        const value = input.value?.trim() ?? null;

        if (isImmediate(setting)) {
            const [existing] = history.values;
            if (existing) {
                id = existing.id;
                await tx.update(userSettingValues).set({value, validFrom: today()}).where(eq(userSettingValues.id, id));
                return;
            }
            await tx.insert(userSettingValues).values({id, userId, settingId: setting.id, value, validFrom: today()});
            return;
        }
        // validFrom fehlt hier nicht, das prüft checkSettingValue
        await tx
            .insert(userSettingValues)
            .values({id, userId, settingId: setting.id, value, validFrom: input.validFrom!});
    });
    return (await getValue(db, id))!;
}

/** Ändert einen geplanten Wert (Regel 7). Ein Wert eines anderen Users ist "nicht gefunden". */
export async function changeSettingValue(userId: string, id: string, patch: UserSettingValueUpdate) {
    await db.transaction(async (tx) => {
        await lockUser(tx, userId);
        const current = await getValue(tx, id);
        if (current?.userId !== userId) throw new SettingNotFoundError();
        const setting = (await getSetting(tx, current.settingId))!;
        const history = historyOf({settings: [setting], values: await valuesOf(tx, userId, setting.id)}, setting.id);

        const changeProblem = checkImmediateEdit(setting) ?? checkChange(history, current.validFrom, today());
        if (changeProblem) throw new RuleError(changeProblem);

        // Wurde nur ein Feld gesendet, gilt für das andere der gespeicherte Wert. null ist ein Wert („Default“).
        const next = {
            value: patch.value !== undefined ? patch.value : current.value,
            validFrom: patch.validFrom ?? current.validFrom,
        };
        const others = history.values.filter((p) => p.id !== id);
        const problem = checkSettingValue(setting, others, next, today());
        if (problem) throw new RuleError(problem);

        await tx
            .update(userSettingValues)
            .set({...next, value: next.value?.trim() ?? null})
            .where(eq(userSettingValues.id, id));
    });
    return (await getValue(db, id))!;
}

/** Löscht einen geplanten Wert (Regel 7) */
export async function deleteSettingValue(userId: string, id: string) {
    await db.transaction(async (tx) => {
        const current = await getValue(tx, id);
        if (current?.userId !== userId) throw new SettingNotFoundError();
        const setting = (await getSetting(tx, current.settingId))!;
        const history = historyOf({settings: [], values: await valuesOf(tx, userId, setting.id)}, setting.id);
        const problem = checkImmediateEdit(setting) ?? checkDelete(history, current.validFrom, today());
        if (problem) throw new RuleError(problem);
        await tx.delete(userSettingValues).where(eq(userSettingValues.id, id));
    });
}
