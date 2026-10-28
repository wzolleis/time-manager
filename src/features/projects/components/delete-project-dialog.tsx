import type {Project} from "@shared/project";
import {ConfirmDeleteButton} from "@/components/buttons/confirm-delete-button";

export interface DeleteProjectDialogProps {
    project: Project;
    onDelete: (project: Project) => void;
    deleting: boolean;
}

export const DeleteProjectDialog = (props: DeleteProjectDialogProps) => {
    const {onDelete, project, deleting} = props;

    return (
        <ConfirmDeleteButton
            title={<>{project.name} löschen?</>}
            description="Das Projekt wird dauerhaft aus der Datenbank entfernt. Das lässt sich nicht rückgängig machen."
            onConfirm={() => onDelete(project)}
            pending={deleting}
        />
    );
};
