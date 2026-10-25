// netlify/functions/lib/mcp-tools/data.ts
// Liest die Daten eines Users so, wie die Endpoints sie der UI liefern (Regel 2)
import {asc, eq, isNull, or} from "drizzle-orm";
import {db} from "../db";
import {holidays, projects, sickLeaves, vacations} from "../../../../db/schema";
import {listEntries} from "../time-entries-store";
import {loadSettingHistory} from "../user-settings-store";
import {SOLL_SETTING_ID} from "../../../../shared/user-setting";
import type {ReportData} from "./report-view";

export const loadProjects = () => db.select().from(projects).orderBy(asc(projects.name));

export const loadProjectNames = async () => new Map((await loadProjects()).map((p) => [p.id, p.name]));

export const loadSickLeaves = (userId: string) =>
    db.select().from(sickLeaves).where(eq(sickLeaves.userId, userId)).orderBy(asc(sickLeaves.startDate));

/** Alles, was die Berichte brauchen. Nacheinander, der Pool hat nur eine Verbindung. */
export async function loadReportData(userId: string): Promise<ReportData> {
    const entries = await listEntries(userId);
    const projectRows = await loadProjects();
    const vacationRows = await db
        .select()
        .from(vacations)
        .where(eq(vacations.userId, userId))
        .orderBy(asc(vacations.startDate));
    const holidayRows = await db
        .select()
        .from(holidays)
        .where(or(isNull(holidays.userId), eq(holidays.userId, userId)))
        .orderBy(asc(holidays.date));
    const sickRows = await loadSickLeaves(userId);
    const soll = await loadSettingHistory(userId, SOLL_SETTING_ID);
    return {entries, projects: projectRows, vacations: vacationRows, holidays: holidayRows, sickLeaves: sickRows, soll};
}
