// src/api/roles.ts
import type {Role} from "@shared/role.ts";
import {request} from "@/api/http.ts";

export const fetchRoles = () => request<Role[]>("/api/roles");

export const fetchUserRoles = (userId: string) => request<Role[]>(`/api/users/${userId}/roles`);

export const updateUserRoles = (userId: string, roleIds: string[]) =>
    request<Role[]>(`/api/users/${userId}/roles`, {method: "PUT", body: JSON.stringify({roleIds})});
