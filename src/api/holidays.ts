import {request} from "./http";
import type {Holiday, HolidayCreate, HolidayUpdate} from "@shared/holiday";

/** Ohne userId nur die globalen Feiertage, mit userId zusätzlich die eigenen dieses Users */
export const fetchHolidays = (userId?: string) =>
    request<Holiday[]>(userId ? `/api/holidays?userId=${userId}` : "/api/holidays");

export const createHoliday = (data: HolidayCreate) =>
    request<Holiday>("/api/holidays", {method: "POST", body: JSON.stringify(data)});

export const updateHoliday = (id: string, data: HolidayUpdate) =>
    request<Holiday>(`/api/holidays/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteHoliday = (id: string) => request<void>(`/api/holidays/${id}`, {method: "DELETE"});
