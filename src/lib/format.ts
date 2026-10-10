export const TZ = "Europe/Berlin";

export const formatTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString("de-DE", {timeZone: TZ, hour: "2-digit", minute: "2-digit"});

export const formatDate = (d: Date | number | string) =>
    new Date(d).toLocaleDateString("de-DE", {
        timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    });

export const formatDuration = (ms: number) => {
    const minutes = Math.max(0, Math.floor(ms / 60_000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} Std ${m} Min` : `${m} Min`;
};