import type {DayKind} from "@shared/target-hours";

/** Hinweis zum Soll: warum ein Tag kein Arbeitstag ist */
export const dayKindLabel = (kind: DayKind, holidayName?: string): string | undefined =>
    kind === "holiday"
        ? `Feiertag: ${holidayName}`
        : kind === "vacation"
          ? "Urlaub"
          : kind === "weekend"
            ? "Wochenende"
            : undefined;
