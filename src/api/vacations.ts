import {request} from "./http";
import type {Vacation, VacationCreate, VacationUpdate} from "@shared/vacation";

const path = (userId: string) => `/api/users/${userId}/vacations`;

export const fetchVacations = (userId: string) => request<Vacation[]>(path(userId));

export const createVacation = (userId: string, data: VacationCreate) =>
    request<Vacation>(path(userId), {method: "POST", body: JSON.stringify(data)});

export const updateVacation = (userId: string, id: string, data: VacationUpdate) =>
    request<Vacation>(`${path(userId)}/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteVacation = (userId: string, id: string) =>
    request<void>(`${path(userId)}/${id}`, {method: "DELETE"});
