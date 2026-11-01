import type {DataTableColumnDef} from "@/components/table/data-table";
import {diffClass} from "@/lib/format";
import {formatDifference, formatDuration, type TimeFormat} from "@shared/format";

export const dash = "–";

type PeriodSums = {targetMs: number; workMs: number; diffMs: number | null};

/**
 * Die Spalten, die Wochen-, Monats- und Jahresbericht gemeinsam haben: Soll, Arbeitszeit und Differenz.
 * Mit duration lassen sich weitere Dauern ergänzen, z. B. die Pausen.
 */
export function periodColumns<T extends PeriodSums>(format: TimeFormat) {
    const duration = (id: string, header: string, ms: (row: T) => number): DataTableColumnDef<T> => ({
        id,
        header,
        enableSorting: false,
        cell: ({row}) => {
            const value = ms(row.original);
            return value > 0 ? formatDuration(value, format) : dash;
        },
    });

    const diff: DataTableColumnDef<T> = {
        id: "diffMs",
        header: "Differenz",
        enableSorting: false,
        cell: ({row}) => {
            const value = row.original.diffMs;
            return value === null ? dash : <span className={diffClass(value)}>{formatDifference(value, format)}</span>;
        },
    };

    return {
        target: duration("targetMs", "Soll", (r) => r.targetMs),
        work: duration("workMs", "Arbeitszeit", (r) => r.workMs),
        diff,
        duration,
    };
}
