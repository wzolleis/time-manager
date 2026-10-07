// src/api/time-entries.ts
import {request} from "./http";
import type {TimeEntry, TimeEntryCreate} from "@shared/time-entry";

// Über JSON kommt bookedAt als ISO-String an, nicht als Date
export type TimeEntryDto = Omit<TimeEntry, "bookedAt"> & { bookedAt: string };

export const fetchTimeEntries = (userId: string) =>
    request<TimeEntryDto[]>(`/api/time-entries?userId=${userId}`);

// JSON.stringify macht aus dem Date automatisch einen ISO-String
export const createTimeEntry = (data: TimeEntryCreate) =>
    request<TimeEntryDto>("/api/time-entries", {
        method: "POST",
        body: JSON.stringify(data),
    });