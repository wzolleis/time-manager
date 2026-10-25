import {request} from "./http";
import type {
    UserSettingsData,
    UserSettingValue,
    UserSettingValueCreate,
    UserSettingValueUpdate,
} from "@shared/user-setting";

const path = (userId: string) => `/api/users/${userId}/settings`;

/** Alle Einstellungen und die eigenen Werte des Users */
export const fetchUserSettings = (userId: string) => request<UserSettingsData>(path(userId));

export const createUserSettingValue = (userId: string, data: UserSettingValueCreate) =>
    request<UserSettingValue>(path(userId), {method: "POST", body: JSON.stringify(data)});

export const updateUserSettingValue = (userId: string, id: string, data: UserSettingValueUpdate) =>
    request<UserSettingValue>(`${path(userId)}/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteUserSettingValue = (userId: string, id: string) =>
    request<void>(`${path(userId)}/${id}`, {method: "DELETE"});
