import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select.tsx";
import {fetchProjects} from "@/api/projects.ts";
import {updateTimeEntry} from "@/api/time-entries.ts";
import {formatTime} from "@/lib/format.ts";
import {localTimeToUtc} from "@shared/day-range.ts";
import {localDay} from "@shared/time-rules.ts";
import type {TimeEntryUpdate} from "@shared/time-entry.ts";
import {TimeEntryDelete} from "@features/time-stamp/components/time-entry-delete.tsx";

export type EntryRow = {
    id: string;
    type: "kommen" | "gehen";
    bookedAt: Date;
    projectId: string | null;
    projectName: string | null;
};

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert

export function EntryActions({entry}: { entry: EntryRow }) {
    const qc = useQueryClient();
    const refresh = () => qc.invalidateQueries({queryKey: ["time-entries"]});
    const projects = useQuery({queryKey: ["projects"], queryFn: fetchProjects});

    const isKommen = entry.type === "kommen";
    const typeLabel = isKommen ? "Kommen" : "Gehen";

    // --- Bearbeiten ---
    const [open, setOpen] = useState(false);
    const [time, setTime] = useState(formatTime(entry.bookedAt));
    const [projectChoice, setProjectChoice] = useState(entry.projectId ?? NO_PROJECT);

    const update = useMutation({
        mutationFn: (data: TimeEntryUpdate) => updateTimeEntry(entry.id, data),
        onSuccess: async () => {
            await refresh();
            setOpen(false);
        },
    });

    // Beim Öffnen immer mit den gespeicherten Werten starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setTime(formatTime(entry.bookedAt));
            setProjectChoice(entry.projectId ?? NO_PROJECT);
            update.reset();
        }
        setOpen(next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Nur Geändertes senden. Die Zeit bleibt unangetastet, wenn sie nicht geändert wurde,
        // damit die Sekunden der ursprünglichen Buchung erhalten bleiben.
        const patch: TimeEntryUpdate = {};
        if (time !== formatTime(entry.bookedAt)) {
            patch.bookedAt = localTimeToUtc(localDay(entry.bookedAt), time);
        }
        const newProject = isKommen && projectChoice !== NO_PROJECT ? projectChoice : null;
        if (newProject !== entry.projectId) patch.projectId = newProject;

        if (Object.keys(patch).length === 0) {
            setOpen(false);
            return;
        }
        update.mutate(patch);
    };

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                    Bearbeiten
                </Button>
                {/* ts-ignore */}
                <TimeEntryDelete entry={entry}/>
            </div>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{typeLabel} bearbeiten</DialogTitle>
                            <DialogDescription>
                                Der Tag bleibt unverändert, die Abfolge von Kommen und Gehen wird geprüft.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 text-left">
                            <Label htmlFor={`time-${entry.id}`}>Uhrzeit</Label>
                            <Input
                                id={`time-${entry.id}`}
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                            />
                        </div>

                        {isKommen && (
                            <div className="space-y-2 text-left">
                                <Label htmlFor={`project-${entry.id}`}>Projekt</Label>
                                <Select value={projectChoice} onValueChange={setProjectChoice}>
                                    <SelectTrigger id={`project-${entry.id}`}>
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
                            </div>
                        )}

                        {update.isError && (
                            <p role="alert" className="text-sm text-destructive">
                                {update.error.message}
                            </p>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit" disabled={update.isPending}>
                                {update.isPending ? "Speichere…" : "Speichern"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}