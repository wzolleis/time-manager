import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {TableCell, TableRow} from "@/components/ui/table";
import type {Project, ProjectUpdate} from "@shared/project";
import {updateProject} from "@/api/projects";
import {DeleteProjectDialog} from "@features/projects/components/delete-project-dialog";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";

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

                            <FormField label="Name" htmlFor={fieldId("name")}>
                                <Input
                                    id={fieldId("name")}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </FormField>

                            {update.isError && <ErrorText>{update.error.message}</ErrorText>}

                            <FormDialogFooter onCancel={() => setOpen(false)} saving={update.isPending} />
                        </form>
                    </DialogContent>
                </Dialog>
            </TableCell>
        </TableRow>
    );
}
