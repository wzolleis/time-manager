import {request} from "./http";
import type {SickLeave, SickLeaveCreate, SickLeaveUpdate} from "@shared/sick-leave";

const path = (userId: string) => `/api/users/${userId}/sick-leaves`;

export const fetchSickLeaves = (userId: string) => request<SickLeave[]>(path(userId));

export const createSickLeave = (userId: string, data: SickLeaveCreate) =>
    request<SickLeave>(path(userId), {method: "POST", body: JSON.stringify(data)});

export const updateSickLeave = (userId: string, id: string, data: SickLeaveUpdate) =>
    request<SickLeave>(`${path(userId)}/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteSickLeave = (userId: string, id: string) =>
    request<void>(`${path(userId)}/${id}`, {method: "DELETE"});
