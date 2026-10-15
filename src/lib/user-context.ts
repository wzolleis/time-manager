// src/lib/user-context.ts
import {createContext, useContext} from "react";
import type {User} from "@shared/user";

export type UserContextValue = {
    // Der angemeldete User. Ohne Anmeldung zeigt der UserProvider die Login-Seite, nie die Kinder.
    currentUser: User;
};

export const UserContext = createContext<UserContextValue | null>(null);

export function useCurrentUser(): UserContextValue {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useCurrentUser braucht einen UserProvider");
    return ctx;
}
