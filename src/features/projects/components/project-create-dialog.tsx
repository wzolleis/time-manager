import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import type {ProjectCreate} from "@shared/project";
import {createProject} from "@/api/projects";
import {FormField} from "@/components/form/form-field";
import {FormDialog} from "@/components/form/form-dialog";

export function ProjectCreateDialog() {
    const qc = useQueryClient();
    const [name, setName] = useState("");

    const create = useMutation({
        mutationFn: (data: ProjectCreate) => createProject(data),
        onSuccess: () => qc.invalidateQueries({queryKey: ["projects"]}),
    });

    // Beim Öffnen leeres Formular und keine alte Fehlermeldung
    const reset = () => {
        setName("");
        create.reset();
    };

    const handleSubmit = (close: () => void) => {
        create.mutate({name}, {onSuccess: close});
    };

    return (
        <FormDialog
            title="Neues Projekt anlegen"
            description="Name ist Pflicht"
            onOpen={reset}
            onSubmit={handleSubmit}
            saving={create.isPending}
            submitLabel="Anlegen"
            error={create.error}
            trigger={<Button>Neues Projekt</Button>}
        >
            <FormField label="Name" htmlFor="create-project-name">
                <Input
                    id="create-project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                />
            </FormField>
        </FormDialog>
    );
}
