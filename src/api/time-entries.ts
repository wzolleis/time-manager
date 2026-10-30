import {request} from "./http";
import type {TimeEntry, TimeEntryCreate, TimeEntryDayCreate, TimeEntryUpdate} from "@shared/time-entry";
import type {Booking} from "@shared/time-rules";

// Über JSON kommt bookedAt als ISO-String an, nicht als Date
export type TimeEntryDto = Omit<TimeEntry, "bookedAt"> & {bookedAt: string};

/** Buchung für die Regeln in shared/time-rules */
export const toBooking = (e: TimeEntryDto): Booking => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)});

const path = (userId: string) => `/api/users/${userId}/time-entries`;

export const fetchTimeEntries = (userId: string) => request<TimeEntryDto[]>(path(userId));

// JSON.stringify macht aus dem Date automatisch einen ISO-String
export const createTimeEntry = (userId: string, data: TimeEntryCreate) =>
    request<TimeEntryDto>(path(userId), {
        method: "POST",
        body: JSON.stringify(data),
    });

// Ein ganzer Tag: der Server legt alle Buchungen des Tages an
export const createTimeEntryDay = (userId: string, data: TimeEntryDayCreate) =>
    request<TimeEntryDto[]>(path(userId), {
        method: "POST",
        body: JSON.stringify(data),
    });

export const updateTimeEntry = (userId: string, id: string, data: TimeEntryUpdate) =>
    request<TimeEntryDto>(`${path(userId)}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });

// pair=true löscht die Buchung zusammen mit ihrem Gegenstück
export const deleteTimeEntry = (userId: string, id: string, pair = false) =>
    request<void>(`${path(userId)}/${id}${pair ? "?pair=true" : ""}`, {method: "DELETE"});
