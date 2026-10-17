import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {formatDayShort, formatDuration, formatTime} from "@/lib/format";
import {localDay} from "@shared/time-rules";
import {TimeEntryCreateDialog} from "@features/time-stamp/components/time-entry-create-dialog";
import {useStampTime} from "@features/time-stamp/use-cases/use-stamp-time";

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert

const formatSince = (iso: string) => {
    const date = new Date(iso);
    if (localDay(date) === localDay(new Date())) return `${formatTime(iso)} Uhr`;
    return `${formatDayShort(date)}, ${formatTime(iso)} Uhr`;
};

export function StampCard() {
    const {currentUser, now, last, isIn, missing, projectName, projects, ...stamping} = useStampTime();
    const [projectChoice, setProjectChoice] = useState(NO_PROJECT);

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
    }

    const stamp = () =>
        stamping.stamp({
            type: isIn ? "gehen" : "kommen",
            projectId: projectChoice === NO_PROJECT ? null : projectChoice,
        });

    return (
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>{currentUser.name}</CardTitle>
                <CardDescription>
                    {stamping.isPending && "Lade Status…"}
                    {stamping.loadError && "Status nicht ladbar"}
                    {stamping.isLoaded && !last && "Noch keine Buchungen"}
                    {missing && <>Gehen zum Kommen am {formatDayShort(missing.bookedAt)} fehlt</>}
                    {last && isIn && !missing && (
                        <>
                            Eingestempelt seit {formatSince(last.bookedAt)} (
                            {formatDuration(now - new Date(last.bookedAt).getTime())})
                            {projectName && <> · {projectName}</>}
                        </>
                    )}
                    {last && !isIn && <>Ausgestempelt seit {formatSince(last.bookedAt)}</>}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {missing ? (
                    <div className="space-y-3">
                        <p className="text-sm text-destructive">
                            Ein Gehen lässt sich nur am Tag des Kommens buchen. Trage es nach, danach kannst du wieder
                            stempeln.
                        </p>
                        <TimeEntryCreateDialog
                            defaultDay={localDay(missing.bookedAt)}
                            defaultType="gehen"
                            label="Gehen nachtragen"
                            variant="default"
                            size="lg"
                        />
                    </div>
                ) : (
                    <>
                        {!isIn && (
                            <Select value={projectChoice} onValueChange={setProjectChoice}>
                                <SelectTrigger aria-label="Projekt wählen">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_PROJECT}>Kein Projekt</SelectItem>
                                    {projects?.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button
                            className="w-full"
                            size="lg"
                            variant={isIn ? "destructive" : "default"}
                            disabled={!stamping.isLoaded || stamping.isStamping}
                            onClick={stamp}
                        >
                            {stamping.isStamping ? "Buche…" : isIn ? "Gehen" : "Kommen"}
                        </Button>
                    </>
                )}

                {stamping.error && (
                    <p role="alert" className="text-sm text-destructive">
                        {stamping.error.message}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
