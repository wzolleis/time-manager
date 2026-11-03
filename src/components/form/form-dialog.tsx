import {type ReactNode, useState} from "react";
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
    // Wie bei shadcn: ohne open verwaltet der Dialog selbst, ob er offen ist. Mit open steuert der Aufrufer,
    // z. B. wenn ein Menüeintrag den Dialog öffnet.
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onOpen?: () => void; // beim Öffnen über den Trigger, z. B. Formular und alte Fehler zurücksetzen
    // close schließt den Dialog, z. B. nach dem Speichern: mutate(data, {onSuccess: close}).
    // Das Neuladen der Seite verhindert der Dialog.
    onSubmit: (close: () => void) => void;
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
    onOpen,
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
    const [ownOpen, setOwnOpen] = useState(false);
    const isOpen = open ?? ownOpen;

    const changeOpen = (next: boolean) => {
        if (next) onOpen?.();
        if (open === undefined) setOwnOpen(next);
        onOpenChange?.(next);
    };
    const close = () => changeOpen(false);

    return (
        <Dialog open={isOpen} onOpenChange={changeOpen}>
            {trigger && (
                <DialogTrigger asChild disabled={triggerDisabled}>
                    {trigger}
                </DialogTrigger>
            )}
            <DialogContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit(close);
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
                        onCancel={close}
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
