import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
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
import {TableCell, TableRow} from "@/components/ui/table";
import type {Project, ProjectUpdate} from "@shared/project";
import {updateProject} from "@/api/projects";
import {DeleteProjectDialog} from "@features/projects/components/delete-project-dialog";

type ProjectRowProps = {
    project: Project;
    onDelete: (project: Project) => void;
    deleting: boolean;
};

export function ProjectRow({project, onDelete, deleting}: ProjectRowProps) {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(project.name);

    const update = useMutation({
        mutationFn: (data: ProjectUpdate) => updateProject(project.id, data),
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["projects"]});
            setOpen(false);
        },
    });

    // Beim Öffnen immer mit den gespeicherten Werten starten
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setName(project.name);
            update.reset();
        }
        setOpen(next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Nur geänderte Felder senden; ein leeres Avatar-Feld entfernt den Avatar
        const patch: ProjectUpdate = {};
        if (name !== project.name) patch.name = name;

        if (Object.keys(patch).length === 0) {
            setOpen(false);
            return;
        }
        update.mutate(patch);
    };

    const fieldId = (field: string) => `${field}-${project.id}`;

    return (
        <TableRow>
            <TableCell className="font-medium">{project.name}</TableCell>
            <TableCell className="space-x-2 text-right">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                    Bearbeiten
                </Button>

                <DeleteProjectDialog project={project} onDelete={onDelete} deleting={deleting} />

                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>Projekt bearbeiten</DialogTitle>
                                <DialogDescription>Änderungen gelten nach dem Speichern sofort.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-2 text-left">
                                <Label htmlFor={fieldId("name")}>Name</Label>
                                <Input
                                    id={fieldId("name")}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

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
            </TableCell>
        </TableRow>
    );
}
