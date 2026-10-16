import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {fetchProjects} from "@/api/projects";
import {createTimeEntry, fetchTimeEntries} from "@/api/time-entries";
import {formatDayShort, formatDuration, formatTime} from "@/lib/format";
import {useCurrentUser} from "@/lib/user-context";
import {useNow} from "@/lib/use-now";
import {findMissingGehen, localDay} from "@shared/time-rules";
import {TimeEntryCreateDialog} from "@features/time-stamp/components/time-entry-create-dialog";

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert

const formatSince = (iso: string) => {
    const date = new Date(iso);
    if (localDay(date) === localDay(new Date())) return `${formatTime(iso)} Uhr`;
    return `${formatDayShort(date)}, ${formatTime(iso)} Uhr`;
};

export function StampCard() {
    const {currentUser} = useCurrentUser();
    const qc = useQueryClient();
    const now = useNow();
    const [projectChoice, setProjectChoice] = useState(NO_PROJECT);

    const userId = currentUser?.id;

    const entries = useQuery({
        queryKey: ["time-entries", userId],
        queryFn: () => fetchTimeEntries(userId!),
        enabled: !!userId,
    });
    const projects = useQuery({queryKey: ["projects"], queryFn: fetchProjects});

    const stamp = useMutation({
        mutationFn: (type: "kommen" | "gehen") =>
            createTimeEntry({
                userId: userId!,
                type,
                bookedAt: new Date(),
                projectId: type === "kommen" && projectChoice !== NO_PROJECT ? projectChoice : undefined,
            }),
        onSuccess: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
    });

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
    }

    // Die API liefert die Buchungen nach Zeit sortiert, die letzte bestimmt den Status
    const last = entries.data?.at(-1);
    const isIn = last?.type === "kommen";
    const missing = entries.data
        ? findMissingGehen(
            entries.data.map((e) => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)})),
            new Date(now),
        )
        : null;
    const projectName = isIn ? projects.data?.find((p) => p.id === last.projectId)?.name : undefined;

    return (
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>{currentUser.name}</CardTitle>
                <CardDescription>
                    {entries.isPending && "Lade Status…"}
                    {entries.isError && "Status nicht ladbar"}
                    {entries.isSuccess && !last && "Noch keine Buchungen"}
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
                            Ein Gehen lässt sich nur am Tag des Kommens buchen. Trage es nach, danach kannst du
                            wieder stempeln.
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
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_PROJECT}>Kein Projekt</SelectItem>
                                    {projects.data?.map((p) => (
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
                            disabled={!entries.isSuccess || stamp.isPending}
                            onClick={() => stamp.mutate(isIn ? "gehen" : "kommen")}
                        >
                            {stamp.isPending ? "Buche…" : isIn ? "Gehen" : "Kommen"}
                        </Button>
                    </>
                )}

                {stamp.isError && (
                    <p role="alert" className="text-sm text-destructive">
                        {stamp.error.message}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}