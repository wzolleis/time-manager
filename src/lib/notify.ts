import {toast} from "sonner";

// Meldungen, die nicht in einer Komponente stehen können, z. B. nach dem Schließen eines Dialogs.
// Angezeigt vom <Toaster /> in application-layout.tsx. Nur hier wird Sonner direkt verwendet.

/** Zeigt einen Fehler als Toast */
export const notifyError = (message: string) => {
    toast.error(message);
};
