// netlify/functions/lib/user-settings-store.ts
// Lesen und Schreiben der Einstellungen eines Users, gemeinsam für die REST-API und den MCP-Server
import {randomUUID} from "node:crypto";
import {and, asc, eq} from "drizzle-orm";
import {db} from "./db";
import {userSettings, userSettingValues, users} from "../../../db/schema";
import {localDay} from "../../../shared/time-rules";
import type {UserSettingsData, UserSettingValueCreate, UserSettingValueUpdate} from "../../../shared/user-setting";
import {
    checkChange,
    checkDelete,
    checkSettingValue,
    historyOf,
    type SettingHistory,
} from "../../../shared/user-setting-rules";
import {RuleError} from "./rule-error";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "select">;

export class SettingNotFoundError extends Error {}

export class UnknownUserError extends Error {}

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

// Sperrt die Zeile des Users bis zum Ende der Transaktion, damit zwei Werte nicht gleichzeitig als
// "erster eigener Wert" rückwirkend eingetragen werden (Regel 3)
const lockUser = async (tx: Tx, userId: string) => {
    const rows = await tx.select({id: users.id}).from(users).where(eq(users.id, userId)).for("update");
    if (rows.length === 0) throw new UnknownUserError();
};

const valuesOf = (tx: Tx, userId: string, settingId: string) =>
    tx
        .select()
        .from(userSettingValues)
        .where(and(eq(userSettingValues.userId, userId), eq(userSettingValues.settingId, settingId)));

const today = () => localDay(new Date());

/** Legt einen neuen Wert an (Regeln 3 bis 6) und liefert ihn zurück */
export async function addSettingValue(userId: string, input: UserSettingValueCreate) {
    const id = randomUUID();
    await db.transaction(async (tx) => {
        await lockUser(tx, userId);
        const setting = await getSetting(tx, input.settingId);
        if (!setting) throw new SettingNotFoundError();
        const history = historyOf({settings: [setting], values: await valuesOf(tx, userId, setting.id)}, setting.id);
        const problem = checkSettingValue(setting, history.values, input, today());
        if (problem) throw new RuleError(problem);
        await tx.insert(userSettingValues).values({id, userId, ...input, value: input.value.trim()});
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

        const changeProblem = checkChange(history, current.validFrom, today());
        if (changeProblem) throw new RuleError(changeProblem);

        // Wurde nur ein Feld gesendet, gilt für das andere der gespeicherte Wert
        const next = {value: patch.value ?? current.value, validFrom: patch.validFrom ?? current.validFrom};
        const others = history.values.filter((p) => p.id !== id);
        const problem = checkSettingValue(setting, others, next, today());
        if (problem) throw new RuleError(problem);

        await tx
            .update(userSettingValues)
            .set({...next, value: next.value.trim()})
            .where(eq(userSettingValues.id, id));
    });
    return (await getValue(db, id))!;
}

/** Löscht einen geplanten Wert (Regel 7) */
export async function deleteSettingValue(userId: string, id: string) {
    await db.transaction(async (tx) => {
        const current = await getValue(tx, id);
        if (current?.userId !== userId) throw new SettingNotFoundError();
        const history = historyOf(
            {settings: [], values: await valuesOf(tx, userId, current.settingId)},
            current.settingId,
        );
        const problem = checkDelete(history, current.validFrom, today());
        if (problem) throw new RuleError(problem);
        await tx.delete(userSettingValues).where(eq(userSettingValues.id, id));
    });
}
