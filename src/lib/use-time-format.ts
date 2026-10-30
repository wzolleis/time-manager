// src/lib/use-time-format.ts
// Anzeige der Dauern in Stunden und Minuten oder in Industriezeit (features/use-case/industriezeit.md).
// Die Einstellung liegt pro User im localStorage, nicht auf dem Server.
import {useCallback, useSyncExternalStore} from "react";
import type {TimeFormat} from "@shared/format";
import {useCurrentUser} from "@/lib/user-context";

const keyOf = (userId: string) => `time-manager:industriezeit:${userId}`;

// Ohne localStorage (z. B. gesperrt im privaten Fenster) gilt die Einstellung nur bis zum Neuladen
const fallback = new Map<string, boolean>();
const listeners = new Set<() => void>();

function read(userId: string): boolean {
    try {
        return localStorage.getItem(keyOf(userId)) === "1";
    } catch {
        return fallback.get(userId) ?? false;
    }
}

function write(userId: string, on: boolean) {
    try {
        if (on) localStorage.setItem(keyOf(userId), "1");
        else localStorage.removeItem(keyOf(userId));
    } catch {
        fallback.set(userId, on);
    }
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener); // Umschalten in einem anderen Tab
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

/** Ist die Industriezeit für den angemeldeten User an? Mit Funktion zum Umschalten. */
export function useIndustrialTime(): [boolean, (on: boolean) => void] {
    const userId = useCurrentUser().currentUser.id;
    const on = useSyncExternalStore(subscribe, () => read(userId));
    const setOn = useCallback((value: boolean) => write(userId, value), [userId]);
    return [on, setOn];
}

/** Das Format der Dauern für formatDuration, formatDifference und formatOffset */
export function useTimeFormat(): TimeFormat {
    return useIndustrialTime()[0] ? "industrial" : "minutes";
}
