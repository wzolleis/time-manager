import {MetricCard} from "@/components/cards/metric-card";
import {diffClass} from "@/lib/format";
import {useTimeFormat} from "@/lib/use-time-format";
import {formatDifference, formatDuration} from "@shared/format";
import {dash} from "@features/reports/components/report-columns";

/** Die Arbeitszeit eines Zeitraums, mit Hinweis, solange gerade gearbeitet wird */
export function WorkMetric({workMs, running}: {workMs: number; running: boolean}) {
    const format = useTimeFormat();
    return (
        <MetricCard
            title="Arbeitszeit"
            value={formatDuration(workMs, format)}
            hint={running ? "läuft noch" : undefined}
        />
    );
}

/** Die Differenz gegen das Soll. diffMs null: keine Differenz (Zukunft oder freier Tag ohne Arbeit). */
export function DiffMetric({diffMs, hint}: {diffMs: number | null; hint?: string}) {
    const format = useTimeFormat();
    return (
        <MetricCard
            title="Differenz"
            value={diffMs === null ? dash : formatDifference(diffMs, format)}
            valueClassName={diffMs === null ? undefined : diffClass(diffMs)}
            hint={hint}
        />
    );
}

type PeriodTotals = {targetToDateMs: number; workMs: number; running: boolean; diffMs: number};

type PeriodMetricsProps = {
    targetMs: number; // Soll des ganzen Zeitraums
    totals: PeriodTotals;
    future: boolean;
    partial: boolean;
};

/**
 * Soll, Arbeitszeit und Differenz eines Monats oder Jahres. future: der Zeitraum liegt ganz in der Zukunft,
 * partial: er hat schon begonnen, ist aber noch nicht vorbei (das Soll bis heute ist kleiner).
 */
export function PeriodMetrics({targetMs, totals, future, partial}: PeriodMetricsProps) {
    const format = useTimeFormat();
    const toDate = partial && !future;
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
                title="Soll"
                value={formatDuration(targetMs, format)}
                hint={toDate ? `bis heute: ${formatDuration(totals.targetToDateMs, format)}` : undefined}
            />
            <WorkMetric workMs={totals.workMs} running={totals.running} />
            <DiffMetric diffMs={future ? null : totals.diffMs} hint={toDate ? "gegen das Soll bis heute" : undefined} />
        </div>
    );
}
