// src/lib/user-context.ts
import {createContext, useContext} from "react";
import type {User} from "@shared/user";

export type UserContextValue = {
    users: User[];
    currentUser: User | null;
    setCurrentUserId: (id: string) => void;
    isPending: boolean;
    isError: boolean;
};

export const UserContext = createContext<UserContextValue | null>(null);

export function useCurrentUser(): UserContextValue {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useCurrentUser braucht einen UserProvider");
    return ctx;
}