import {request} from "./http";
import type {Holiday, HolidayCreate, HolidayUpdate} from "@shared/holiday";

// userId null: die globalen Feiertage unter /api/holidays, sonst die eines Users unter /api/users/:userId/holidays
const path = (userId: string | null) => (userId ? `/api/users/${userId}/holidays` : "/api/holidays");

/** Ohne userId nur die globalen Feiertage, mit userId zusätzlich die eigenen dieses Users */
export const fetchHolidays = (userId?: string) => request<Holiday[]>(path(userId ?? null));

export const createHoliday = (userId: string | null, data: HolidayCreate) =>
    request<Holiday>(path(userId), {method: "POST", body: JSON.stringify(data)});

export const updateHoliday = (userId: string | null, id: string, data: HolidayUpdate) =>
    request<Holiday>(`${path(userId)}/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteHoliday = (userId: string | null, id: string) =>
    request<void>(`${path(userId)}/${id}`, {method: "DELETE"});
