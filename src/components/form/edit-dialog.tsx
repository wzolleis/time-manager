import type {FormEvent, ReactNode} from "react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {ErrorText} from "@/components/text/error-text";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";

type Props = {
    title: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (e: FormEvent) => void;
    saving: boolean;
    error: Error | null; // Fehler beim Speichern
    children: ReactNode; // die Felder
};

/** Dialog zum Bearbeiten eines Datensatzes: Felder, Fehler beim Speichern und Abbrechen/Speichern */
export function EditDialog({title, open, onOpenChange, onSubmit, saving, error, children}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={onSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>Änderungen gelten nach dem Speichern sofort.</DialogDescription>
                    </DialogHeader>

                    {children}

                    {error && <ErrorText>{error.message}</ErrorText>}

                    <FormDialogFooter onCancel={() => onOpenChange(false)} saving={saving} />
                </form>
            </DialogContent>
        </Dialog>
    );
}
