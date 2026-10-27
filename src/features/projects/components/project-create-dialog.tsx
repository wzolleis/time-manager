import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import type {ProjectCreate} from "@shared/project";
import {createProject} from "@/api/projects";
import {ErrorText} from "@/components/text/error-text";
import {FormField} from "@/components/form/form-field";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";

export function ProjectCreateDialog() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");

    const create = useMutation({
        mutationFn: (data: ProjectCreate) => createProject(data),
        onSuccess: async () => {
            await qc.invalidateQueries({queryKey: ["projects"]});
            setOpen(false);
        },
    });

    // Beim Öffnen und Schließen leeres Formular und keine alte Fehlermeldung
    const handleOpenChange = (next: boolean) => {
        setName("");
        create.reset();
        setOpen(next);
    };

    const handleSubmit = (e: React.SubmitEvent) => {
        e.preventDefault();
        create.mutate({
            name,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>Neues Projekt</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Neues Projekt anlegen</DialogTitle>
                        <DialogDescription>Name ist Pflicht</DialogDescription>
                    </DialogHeader>

                    <FormField label="Name" htmlFor="create-project-name">
                        <Input
                            id="create-project-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </FormField>

                    {create.isError && <ErrorText>{create.error.message}</ErrorText>}

                    <FormDialogFooter
                        onCancel={() => handleOpenChange(false)}
                        saving={create.isPending}
                        submitLabel="Anlegen"
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
}
