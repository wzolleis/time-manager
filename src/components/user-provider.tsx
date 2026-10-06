// src/components/user-provider.tsx
import {type ReactNode, useCallback, useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {fetchUsers} from "@/api/users";
import {UserContext, type UserContextValue} from "@/lib/user-context";
import type {User} from "@shared/user";

const STORAGE_KEY = "time-manager:user-id";
const NO_USERS: User[] = []; // stabile Referenz, damit useMemo nicht ständig neu rechnet

// Der Zugriff auf localStorage kann scheitern (privater Modus, gesperrter Speicher)
const readStored = (): string | null => {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

export function UserProvider({children}: { children: ReactNode }) {
    const {data, isPending, isError} = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
    });
    const users = data ?? NO_USERS;

    const [selectedId, setSelectedId] = useState<string | null>(readStored);

    // Abgeleitet statt per Effekt gesetzt: ein ungültiger gespeicherter Wert
    // fällt automatisch auf den ersten User zurück
    const currentUser = users.find((u) => u.id === selectedId) ?? users[0] ?? null;

    const setCurrentUserId = useCallback((id: string) => {
        setSelectedId(id);
        try {
            localStorage.setItem(STORAGE_KEY, id);
        } catch {
            // Speichern nicht möglich: die Auswahl gilt dann nur bis zum Neuladen
        }
    }, []);

    const value = useMemo<UserContextValue>(
        () => ({users, currentUser, setCurrentUserId, isPending, isError}),
        [users, currentUser, setCurrentUserId, isPending, isError],
    );

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}