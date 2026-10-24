import {request} from "./http";
import type {Overtime, OvertimeUpdate} from "@shared/overtime";

// created kommt als ISO-String über JSON
export type OvertimeDto = Omit<Overtime, "created"> & {created: string};

const path = (userId: string) => `/api/users/${userId}/overtime`;

/** Die Korrektur der Überstunden, null: noch keine */
export const fetchOvertime = (userId: string) => request<OvertimeDto | null>(path(userId));

/** Setzt den Korrekturwert absolut, legt den Eintrag an oder überschreibt ihn */
export const saveOvertime = (userId: string, data: OvertimeUpdate) =>
    request<OvertimeDto>(path(userId), {method: "PUT", body: JSON.stringify(data)});
