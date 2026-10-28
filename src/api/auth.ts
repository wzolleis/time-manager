import type {AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON} from "@simplewebauthn/browser";
import type {Login, PasswordChange, PasswordReset} from "@shared/auth";
import type {CurrentUser} from "@shared/user";
import {ApiError, request} from "@/api/http";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/** Der angemeldete User, null wenn keine gültige Session besteht */
export async function fetchMe(): Promise<CurrentUser | null> {
    try {
        return await request<CurrentUser>("/api/auth/me");
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
    }
}

export const login = (data: Login) =>
    request<CurrentUser>("/api/auth/login", {method: "POST", body: JSON.stringify(data)});

/** Optionen mit einer neuen Challenge für den Dialog des Browsers, ohne Session */
export const fetchPasskeyLoginOptions = () =>
    request<PublicKeyCredentialRequestOptionsJSON>("/api/auth/passkey-login-options", {method: "POST"});

export const loginWithPasskey = (response: AuthenticationResponseJSON) =>
    request<CurrentUser>("/api/auth/passkey-login", {method: "POST", body: JSON.stringify({response})});

export const logout = () => request<void>("/api/auth/logout", {method: "POST"});

export const changePassword = (data: PasswordChange) =>
    request<void>("/api/auth/password", {method: "POST", body: JSON.stringify(data)});

export const resetPassword = (data: PasswordReset) =>
    request<void>("/api/auth/reset-password", {method: "POST", body: JSON.stringify(data)});
