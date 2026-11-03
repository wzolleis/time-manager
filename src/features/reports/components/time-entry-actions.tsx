import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {formatTime} from "@shared/format";
import {localDay} from "@shared/time-rules";
import {useProjects} from "@/views/projects";
import {TimeEntryDelete} from "@features/reports/components/time-entry-delete";
import {useChangeTimeEntry} from "@features/reports/use-cases/use-change-time-entry";
import type {EntryRow} from "@features/reports/time-entry-row";
import {isOptimistic} from "@features/reports/time-entries-cache";
import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";
import {FormField} from "@/components/form/form-field";
import {RowActions} from "@/components/table/row-actions";

const NO_PROJECT = "none"; // Radix Select erlaubt keinen leeren String als Wert

export function EntryActions({entry}: {entry: EntryRow}) {
    const projects = useProjects();
    const update = useChangeTimeEntry();

    const isKommen = entry.type === "kommen";
    const pending = isOptimistic(entry.id); // noch nicht gespeichert, der Server kennt die Id nicht
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
        }
        setOpen(next);
    };

    const problem = update.problem({entry, time});
    const sickNotice = update.sickNotice(localDay(entry.bookedAt)); // der Tag bleibt beim Bearbeiten gleich

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>): void => {
        e.preventDefault();
        if (problem) return;
        // Die Änderung steht sofort in der Liste, ein Fehler des Servers kommt als Toast
        update.change({entry, time, projectId: projectChoice === NO_PROJECT ? null : projectChoice});
        setOpen(false);
    };

    return (
        <>
            <RowActions>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => handleOpenChange(true)}>
                    Bearbeiten
                </Button>
                <TimeEntryDelete entry={entry} />
            </RowActions>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{typeLabel} bearbeiten</DialogTitle>
                            <DialogDescription>
                                Der Tag bleibt unverändert, die Abfolge von Kommen und Gehen wird geprüft.
                            </DialogDescription>
                        </DialogHeader>

                        <FormField label="Uhrzeit" htmlFor={`time-${entry.id}`}>
                            <Input
                                id={`time-${entry.id}`}
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                            />
                        </FormField>

                        {isKommen && (
                            <FormField label="Projekt" htmlFor={`project-${entry.id}`}>
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
                            </FormField>
                        )}

                        {sickNotice && <Muted>{sickNotice}</Muted>}
                        {problem && <ErrorText alert={false}>{problem}</ErrorText>}

                        <FormDialogFooter onCancel={() => setOpen(false)} saving={false} disabled={problem !== null} />
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
