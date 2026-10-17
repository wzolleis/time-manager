import {request} from "./http";
import type {SickLeave, SickLeaveCreate, SickLeaveUpdate} from "@shared/sick-leave";

export const fetchSickLeaves = (userId: string) => request<SickLeave[]>(`/api/sick-leaves?userId=${userId}`);

export const createSickLeave = (data: SickLeaveCreate) =>
    request<SickLeave>("/api/sick-leaves", {method: "POST", body: JSON.stringify(data)});

export const updateSickLeave = (id: string, data: SickLeaveUpdate) =>
    request<SickLeave>(`/api/sick-leaves/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteSickLeave = (id: string) => request<void>(`/api/sick-leaves/${id}`, {method: "DELETE"});
