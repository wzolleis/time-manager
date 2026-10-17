import {request} from "./http";
import type {TimeEntry, TimeEntryCreate, TimeEntryUpdate} from "@shared/time-entry";
import type {Booking} from "@shared/time-rules";

// Über JSON kommt bookedAt als ISO-String an, nicht als Date
export type TimeEntryDto = Omit<TimeEntry, "bookedAt"> & {bookedAt: string};

/** Buchung für die Regeln in shared/time-rules */
export const toBooking = (e: TimeEntryDto): Booking => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)});

export const fetchTimeEntries = (userId: string) => request<TimeEntryDto[]>(`/api/time-entries?userId=${userId}`);

// JSON.stringify macht aus dem Date automatisch einen ISO-String
export const createTimeEntry = (data: TimeEntryCreate) =>
    request<TimeEntryDto>("/api/time-entries", {
        method: "POST",
        body: JSON.stringify(data),
    });

export const updateTimeEntry = (id: string, data: TimeEntryUpdate) =>
    request<TimeEntryDto>(`/api/time-entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });

// pair=true löscht die Buchung zusammen mit ihrem Gegenstück
export const deleteTimeEntry = (id: string, pair = false) =>
    request<void>(`/api/time-entries/${id}${pair ? "?pair=true" : ""}`, {method: "DELETE"});
