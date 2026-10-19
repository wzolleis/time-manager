import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {formatTime} from "@shared/format";
import {localDay} from "@shared/time-rules";
import {useProjects} from "@/views/projects";
import {TimeEntryDelete} from "@features/reports/components/time-entry-delete";
import {useChangeTimeEntry} from "@features/reports/use-cases/use-change-time-entry";
import type {EntryRow} from "@features/reports/time-entry-row";

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert

export function EntryActions({entry}: {entry: EntryRow}) {
    const projects = useProjects();
    const update = useChangeTimeEntry();

    const isKommen = entry.type === "kommen";
    const typeLabel = isKommen ? "Kommen" : "Gehen";

    // --- Bearbeiten ---
    const [open, setOpen] = useState(false);
    const [time, setTime] = useState(formatTime(entry.bookedAt));
    const [projectChoice, setProjectChoice] = useState(entry.projectId ?? NO_PROJECT);

    // Beim Öffnen immer mit den gespeicherten Werten starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setTime(formatTime(entry.bookedAt));
            setProjectChoice(entry.projectId ?? NO_PROJECT);
            update.reset();
        }
        setOpen(next);
    };

    const problem = update.problem({entry, time});
    const sickNotice = update.sickNotice(localDay(entry.bookedAt)); // der Tag bleibt beim Bearbeiten gleich

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>): void => {
        e.preventDefault();
        if (problem) return;
        update.change(
            {entry, time, projectId: projectChoice === NO_PROJECT ? null : projectChoice},
            {onSuccess: () => setOpen(false)},
        );
    };

    return (
        <div className="space-y-1">
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                    Bearbeiten
                </Button>
                <TimeEntryDelete entry={entry} />
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
                                        <SelectValue />
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

                        {sickNotice && <p className="text-sm text-muted-foreground">{sickNotice}</p>}
                        {problem && <p className="text-sm text-destructive">{problem}</p>}
                        {update.error && (
                            <p role="alert" className="text-sm text-destructive">
                                {update.error.message}
                            </p>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit" disabled={update.isSaving || problem !== null}>
                                {update.isSaving ? "Speichere…" : "Speichern"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
