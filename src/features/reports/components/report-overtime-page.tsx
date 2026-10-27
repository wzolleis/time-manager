import {MetricCard} from "@/components/cards/metric-card";
import {diffClass} from "@/lib/format";
import {balanceMinutes, formatOffset} from "@shared/overtime-rules";
import {localDay} from "@shared/time-rules";
import {germanDay} from "@shared/vacation-rules";
import {OvertimeDialog} from "@features/reports/components/overtime-dialog";
import {useShowOvertime} from "@features/reports/use-cases/use-show-overtime";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";

/** Saldo der Überstunden als Karte, darunter die letzte Korrektur. Seite für /user/reports/overtime */
export function ReportOvertimePage() {
    const report = useShowOvertime();
    const {currentUser, correction} = report;

    if (!currentUser) {
        return <Muted className="p-4">Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-semibold">Überstunden</h1>
                    <Muted>{currentUser.name}</Muted>
                </div>
                {!report.isPending && !report.error && <OvertimeDialog offset={correction?.offset ?? null} />}
            </div>

            {report.isPending && <Loading />}
            {report.error && <LoadError error={report.error} onRetry={report.retry} />}
            {!report.isPending && !report.error && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard
                        title="Überstunden"
                        value={`${formatOffset(balanceMinutes(report.balanceMs))} h`}
                        valueClassName={diffClass(report.balanceMs)}
                        hint={
                            correction
                                ? `Korrektur am ${germanDay(localDay(correction.created))}: ${formatOffset(correction.offset)} h`
                                : "Keine Korrektur"
                        }
                    />
                </div>
            )}
        </div>
    );
}
