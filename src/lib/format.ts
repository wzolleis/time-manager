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

/** Farbe der Differenz: grün bei Plus, rot bei Minus */
export const diffClass = (ms: number) =>
    ms >= 60_000 ? "text-green-600 dark:text-green-500" : ms <= -60_000 ? "text-destructive" : "";

export const formatDayShort = (d: Date) =>
    d.toLocaleDateString("de-DE", {timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit"});

export const formatDayMonth = (d: Date) =>
    d.toLocaleDateString("de-DE", {timeZone: TZ, day: "2-digit", month: "2-digit"});
