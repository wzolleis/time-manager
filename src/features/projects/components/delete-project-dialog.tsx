import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {Button, buttonVariants} from "@/components/ui/button";
import type {Project} from "@shared/project";

export interface DeleteProjectDialogProps {
    project: Project;
    onDelete: (project: Project) => void;
    deleting: boolean
}


export const DeleteProjectDialog = (props: DeleteProjectDialogProps) => {
    const {onDelete, project, deleting} = props;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                    {deleting ? "Lösche…" : "Löschen"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{project.name} löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Das Projekt wird dauerhaft aus der Datenbank entfernt. Das lässt sich
                        nicht rückgängig machen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                        className={buttonVariants({variant: "destructive"})}
                        onClick={() => onDelete(project)}
                    >
                        Löschen
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}