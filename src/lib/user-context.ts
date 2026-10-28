// src/lib/user-context.ts
import {createContext, useContext} from "react";
import type {CurrentUser} from "@shared/user";
import {hasAdminRole} from "@shared/role";

export type UserContextValue = {
    // Der angemeldete User. Ohne Anmeldung zeigt der UserProvider die Login-Seite, nie die Kinder.
    currentUser: CurrentUser;
};

export const UserContext = createContext<UserContextValue | null>(null);

export function useCurrentUser(): UserContextValue {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useCurrentUser braucht einen UserProvider");
    return ctx;
}

/** Hat der angemeldete User die Rolle Administrator? Nur für die Anzeige, die API prüft selbst. */
export function useIsAdmin(): boolean {
    return hasAdminRole(useCurrentUser().currentUser.roleIds);
}
