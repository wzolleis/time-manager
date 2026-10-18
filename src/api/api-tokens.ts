import {request} from "./http";
import type {ApiToken, ApiTokenCreate, CreatedApiToken, UserApiToken} from "@shared/api-token";

/** Die eigenen Agent-Tokens des angemeldeten Users */
export const fetchApiTokens = () => request<ApiToken[]>("/api/api-tokens");

/** Die Agent-Tokens aller User, nur für Administratoren */
export const fetchAllApiTokens = () => request<UserApiToken[]>("/api/admin/api-tokens");

export const createApiToken = (data: ApiTokenCreate) =>
    request<CreatedApiToken>("/api/api-tokens", {method: "POST", body: JSON.stringify(data)});

export const revokeApiToken = (id: string) => request<void>(`/api/api-tokens/${id}`, {method: "DELETE"});

export const revokeAnyApiToken = (id: string) => request<void>(`/api/admin/api-tokens/${id}`, {method: "DELETE"});
