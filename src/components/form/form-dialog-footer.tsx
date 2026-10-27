import {Button} from "@/components/ui/button";
import {DialogFooter} from "@/components/ui/dialog";

type FormDialogFooterProps = {
    onCancel: () => void;
    saving: boolean; // sperrt den Button und zeigt savingLabel
    disabled?: boolean; // z. B. solange die Eingaben ungültig sind
    submitLabel?: string;
    savingLabel?: string;
};

/** Fuß eines Formulardialogs mit Abbrechen und Absenden */
export function FormDialogFooter({
    onCancel,
    saving,
    disabled = false,
    submitLabel = "Speichern",
    savingLabel = "Speichere…",
}: FormDialogFooterProps) {
    return (
        <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
            </Button>
            <Button type="submit" disabled={saving || disabled}>
                {saving ? savingLabel : submitLabel}
            </Button>
        </DialogFooter>
    );
}
