// src/api/auth.ts
import type {Login, PasswordChange, PasswordReset} from "@shared/auth";
import type {User} from "@shared/user";
import {ApiError, request} from "@/api/http";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/** Der angemeldete User, null wenn keine gültige Session besteht */
export async function fetchMe(): Promise<User | null> {
    try {
        return await request<User>("/api/auth/me");
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
    }
}

export const login = (data: Login) => request<User>("/api/auth/login", {method: "POST", body: JSON.stringify(data)});

export const logout = () => request<void>("/api/auth/logout", {method: "POST"});

export const changePassword = (data: PasswordChange) =>
    request<void>("/api/auth/password", {method: "POST", body: JSON.stringify(data)});

export const resetPassword = (data: PasswordReset) =>
    request<void>("/api/auth/reset-password", {method: "POST", body: JSON.stringify(data)});
