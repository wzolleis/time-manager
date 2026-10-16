// src/api/users.ts
import type {User, UserCreate, UserUpdate} from "@shared/user";
import {request} from "@/api/http";

export const fetchUsers = () => request<User[]>("/api/users");

export const createUser = (data: UserCreate) =>
    request<User>("/api/users", {method: "POST", body: JSON.stringify(data)});

export const updateUser = (id: string, data: UserUpdate) =>
    request<User>(`/api/users/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteUser = (id: string) => request<void>(`/api/users/${id}`, {method: "DELETE"});
