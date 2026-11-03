import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Input} from "@/components/ui/input";
import type {Project, ProjectUpdate} from "@shared/project";
import {deleteProject, updateProject} from "@/api/projects";
import {FormField} from "@/components/form/form-field";
import {EditDialog} from "@/components/form/edit-dialog";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";
import {RowActions} from "@/components/table/row-actions";
import {EditButton} from "@/components/buttons/edit-button";

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

    const handleSubmit = () => {
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
        <>
            <RowActions error={remove.error}>
                <EditButton onClick={() => handleOpenChange(true)} />

                <ConfirmDeleteButton
                    title={<>{project.name} löschen?</>}
                    description="Das Projekt wird dauerhaft aus der Datenbank entfernt. Das lässt sich nicht rückgängig machen."
                    onConfirm={() => remove.mutate(project.id)}
                    onOpen={() => remove.reset()}
                    pending={remove.isPending}
                />
            </RowActions>

            <EditDialog
                title="Projekt bearbeiten"
                open={open}
                onOpenChange={handleOpenChange}
                onSubmit={handleSubmit}
                saving={update.isPending}
                error={update.error}
            >
                <FormField label="Name" htmlFor={fieldId("name")}>
                    <Input id={fieldId("name")} value={name} onChange={(e) => setName(e.target.value)} required />
                </FormField>
            </EditDialog>
        </>
    );
}
