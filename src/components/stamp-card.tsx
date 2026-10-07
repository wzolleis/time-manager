// src/components/stamp-card.tsx
import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {fetchProjects} from "@/api/projects";
import {createTimeEntry, fetchTimeEntries} from "@/api/time-entries";
import {useCurrentUser} from "@/lib/user-context";
import {useNow} from "@/lib/use-now";
import {localDay} from "@shared/time-rules";

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert
const TZ = "Europe/Berlin";

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("de-DE", {timeZone: TZ, hour: "2-digit", minute: "2-digit"});

const formatSince = (iso: string) => {
    const date = new Date(iso);
    if (localDay(date) === localDay(new Date())) return `${formatTime(iso)} Uhr`;
    const day = date.toLocaleDateString("de-DE", {timeZone: TZ, day: "2-digit", month: "2-digit"});
    return `${day}., ${formatTime(iso)} Uhr`;
};

const formatDuration = (ms: number) => {
    const minutes = Math.max(0, Math.floor(ms / 60_000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} Std ${m} Min` : `${m} Min`;
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
    const projectName = isIn
        ? projects.data?.find((p) => p.id === last.projectId)?.name
        : undefined;

    return (
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>{currentUser.name}</CardTitle>
                <CardDescription>
                    {entries.isPending && "Lade Status…"}
                    {entries.isError && "Status nicht ladbar"}
                    {entries.isSuccess && !last && "Noch keine Buchungen"}
                    {last && isIn && (
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

                {stamp.isError && (
                    <p role="alert" className="text-sm text-destructive">
                        {stamp.error.message}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}