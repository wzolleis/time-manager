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
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import type {ProjectCreate} from "@shared/project";
import {createProject} from "@/api/projects";

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

                    <div className="space-y-2">
                        <Label htmlFor="create-project-name">Name</Label>
                        <Input
                            id="create-project-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    {create.isError && (
                        <p role="alert" className="text-sm text-destructive">
                            {create.error.message}
                        </p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={create.isPending}>
                            {create.isPending ? "Speichere…" : "Anlegen"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
