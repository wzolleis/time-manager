import type {ReactNode} from "react";
import {Button} from "@/components/ui/button";

const LABELS = {
    day: {previous: "Vorheriger Tag", next: "Nächster Tag", current: "Heute"},
    week: {previous: "Vorherige Woche", next: "Nächste Woche", current: "Diese Woche"},
    month: {previous: "Vorheriger Monat", next: "Nächster Monat", current: "Dieser Monat"},
    year: {previous: "Vorheriges Jahr", next: "Nächstes Jahr", current: "Dieses Jahr"},
};

type PeriodNavProps = {
    unit: keyof typeof LABELS;
    onPrevious: () => void;
    onNext: () => void;
    onCurrent: () => void;
    previousDisabled?: boolean;
    currentDisabled?: boolean; // meist: der aktuelle Zeitraum wird schon angezeigt
    picker?: ReactNode; // zwischen ← und →, z. B. ein Datumsfeld
    children?: ReactNode; // weitere Aktionen am Ende der Leiste
};

/** Leiste zum Blättern durch Tage, Wochen, Monate oder Jahre */
export function PeriodNav({
    unit,
    onPrevious,
    onNext,
    onCurrent,
    previousDisabled,
    currentDisabled,
    picker,
    children,
}: PeriodNavProps) {
    const labels = LABELS[unit];
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                aria-label={labels.previous}
                disabled={previousDisabled}
                onClick={onPrevious}
            >
                ←
            </Button>
            {picker}
            <Button variant="outline" size="sm" aria-label={labels.next} onClick={onNext}>
                →
            </Button>
            <Button variant="ghost" size="sm" disabled={currentDisabled} onClick={onCurrent}>
                {labels.current}
            </Button>
            {children}
        </div>
    );
}
