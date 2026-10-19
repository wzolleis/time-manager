// Texte für Zeiten, Tage und Dauern, wie UI und MCP-Server sie zeigen
import type {DayKind} from "./target-hours";

export const TZ = "Europe/Berlin";

export const formatTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString("de-DE", {timeZone: TZ, hour: "2-digit", minute: "2-digit"});

export const formatDate = (d: Date | number | string) =>
    new Date(d).toLocaleDateString("de-DE", {
        timeZone: TZ,
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

export const formatDuration = (ms: number) => {
    const minutes = Math.max(0, Math.floor(ms / 60_000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} Min`;
    return m === 0 ? `${h} Std` : `${h} Std ${m} Min`;
};

/** Mit Vorzeichen: "+1 Std 20 Min", "−2 Std", "±0 Min" (unter einer Minute) */
export const formatDifference = (ms: number) => {
    const text = formatDuration(Math.abs(ms));
    if (Math.abs(ms) < 60_000) return "±0 Min";
    return `${ms > 0 ? "+" : "−"}${text}`;
};

export const formatDayShort = (d: Date) =>
    d.toLocaleDateString("de-DE", {timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit"});

export const formatDayMonth = (d: Date) =>
    d.toLocaleDateString("de-DE", {timeZone: TZ, day: "2-digit", month: "2-digit"});

/** Monat ("JJJJ-MM") ausgeschrieben: "Oktober 2026" */
export const formatMonth = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("de-DE", {
        timeZone: "UTC",
        month: "long",
        year: "numeric",
    });
};

/** Tag und Uhrzeit kurz: "19.10.2026, 08:00" */
export const formatDateTime = (d: Date | string) =>
    new Date(d).toLocaleString("de-DE", {timeZone: TZ, dateStyle: "medium", timeStyle: "short"});

/** Hinweis zum Soll: warum ein Tag kein Arbeitstag ist */
export function dayKindLabel(kind: DayKind, holidayName?: string): string | undefined {
    switch (kind) {
        case "holiday":
            return `Feiertag: ${holidayName}`;
        case "sick":
            return "krank";
        case "vacation":
            return "Urlaub";
        case "weekend":
            return "Wochenende";
        case "untracked":
            return "vor Beginn der Zeiterfassung";
        case "workday":
            return undefined;
        default:
            return kind satisfies never; // ein neuer DayKind fällt hier beim Kompilieren auf
    }
}
