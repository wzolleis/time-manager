/** Farbe der Differenz: grün bei Plus, rot bei Minus */
export const diffClass = (ms: number) =>
    ms >= 60_000 ? "text-green-600 dark:text-green-500" : ms <= -60_000 ? "text-destructive" : "";
