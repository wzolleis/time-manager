import {request} from "./http";
import type {Vacation, VacationCreate, VacationUpdate} from "@shared/vacation";

export const fetchVacations = (userId: string) =>
    request<Vacation[]>(`/api/vacations?userId=${userId}`);

export const createVacation = (data: VacationCreate) =>
    request<Vacation>("/api/vacations", {method: "POST", body: JSON.stringify(data)});

export const updateVacation = (id: string, data: VacationUpdate) =>
    request<Vacation>(`/api/vacations/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteVacation = (id: string) =>
    request<void>(`/api/vacations/${id}`, {method: "DELETE"});