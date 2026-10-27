/**
 * Übersetzt einen Fehler aus dem Dialog des Browsers (@simplewebauthn/browser) in eine Meldung für den User.
 * Fehler des Servers (ApiError) bleiben, wie sie sind.
 */
export function passkeyError(err: unknown, cancelled: string): Error {
    if (!(err instanceof Error)) return new Error(String(err));
    // Abbruch durch den User, Zeitüberschreitung oder kein passender Passkey: der Browser unterscheidet das nicht
    if (err.name === "NotAllowedError" || err.name === "AbortError") return new Error(cancelled);
    if ((err as {code?: string}).code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
        return new Error("Auf diesem Gerät ist schon ein Passkey für dich eingetragen");
    }
    return err;
}
