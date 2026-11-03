import type {ReactNode} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {ErrorText} from "@/components/text/error-text";
import {FormDialogFooter} from "@/components/form/form-dialog-footer";

type FormDialogProps = {
    title: ReactNode;
    description: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void; // das Neuladen der Seite verhindert der Dialog
    saving: boolean;
    error?: Error | null; // Fehler beim Speichern
    disabled?: boolean; // sperrt das Absenden, z. B. solange die Eingaben ungültig sind
    submitLabel?: string;
    savingLabel?: string;
    trigger?: ReactNode; // öffnet den Dialog; ohne Trigger steuert der Aufrufer open
    triggerDisabled?: boolean;
    children: ReactNode; // die Felder und Hinweise
};

/** Dialog mit einem Formular: Titel, Beschreibung, Felder, Fehler beim Speichern und Abbrechen/Absenden */
export function FormDialog({
    title,
    description,
    open,
    onOpenChange,
    onSubmit,
    saving,
    error,
    disabled,
    submitLabel,
    savingLabel,
    trigger,
    triggerDisabled,
    children,
}: FormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && (
                <DialogTrigger asChild disabled={triggerDisabled}>
                    {trigger}
                </DialogTrigger>
            )}
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit();
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>

                    {children}

                    {error && <ErrorText>{error.message}</ErrorText>}

                    <FormDialogFooter
                        onCancel={() => onOpenChange(false)}
                        saving={saving}
                        disabled={disabled}
                        submitLabel={submitLabel}
                        savingLabel={savingLabel}
                    />
                </form>
            </DialogContent>
        </Dialog>
    );
}
