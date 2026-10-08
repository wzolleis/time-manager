import type {Project, ProjectUpdate} from "@shared/project.ts";
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
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateProject} from "@/api/projects.ts";
import {useState} from "react";

export interface UpdateProjectDialogProps {
    project: Project;
    handleOpenChange: (next: boolean) => void;
    handleSubmit: (e: React.SubmitEvent) => void
}

export const UpdateProjectDialog = (props: UpdateProjectDialogProps) => {
    const {handleOpenChange, handleSubmit, project} = props;
    const qc = useQueryClient();
    const [name, setName] = useState(project.name);

    const [open, setOpen] = useState(false);

    const fieldId = (field: string) => `${field}-${project.id}`;

    const onProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
    }

    const update = useMutation({
        mutationFn: (data: ProjectUpdate) => updateProject(project.id, data),
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["projects"]});
            setOpen(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Projekt bearbeiten</DialogTitle>
                        <DialogDescription>
                            Änderungen gelten nach dem Speichern sofort.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 text-left">
                        <Label htmlFor={fieldId("name")}>Name</Label>
                        <Input
                            id={fieldId("name")}
                            value={name}
                            onChange={onProjectNameChange}
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
    )
}