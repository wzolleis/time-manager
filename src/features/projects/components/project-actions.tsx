import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import type {Project, ProjectUpdate} from "@shared/project";
import {deleteProject, updateProject} from "@/api/projects";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

/** Aktionen je Zeile: Projekt bearbeiten oder löschen */
export function ProjectActions({project}: {project: Project}) {
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

    const remove = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => qc.invalidateQueries({queryKey: ["projects"]}),
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

        // Nur geänderte Felder senden
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
        <div className="space-y-1">
            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
                    Bearbeiten
                </Button>

                <ConfirmDeleteButton
                    title={<>{project.name} löschen?</>}
                    description="Das Projekt wird dauerhaft aus der Datenbank entfernt. Das lässt sich nicht rückgängig machen."
                    onConfirm={() => remove.mutate(project.id)}
                    onOpen={() => remove.reset()}
                    pending={remove.isPending}
                />
            </div>

            {remove.isError && <ErrorText className="text-right">{remove.error.message}</ErrorText>}

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
        </div>
    );
}
