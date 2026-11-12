import {toast} from "sonner";
import {formatTime} from "@shared/format";

// Meldungen, die nicht in einer Komponente stehen können, z. B. nach dem Schließen eines Dialogs.
// Angezeigt vom <Toaster /> in application-layout.tsx. Nur hier wird Sonner direkt verwendet.

/** Zeigt einen Fehler als Toast, mit der Uhrzeit vorne: So erkennt der User, ob der Fehler neu oder älter ist */
export const notifyError = (message: string) => {
    toast.error(`${formatTime(new Date())} Uhr: ${message}`);
};
