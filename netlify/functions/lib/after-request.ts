// netlify/functions/lib/after-request.ts
// Aufräumen nach einer Anfrage, z. B. den DB-Pool unter netlify dev schließen (lib/db.ts).
// Eigenes Modul, weil db.ts schon timing.ts importiert und withTiming die Hooks ausführt.
type Hook = () => Promise<void>;

const hooks: Hook[] = [];

export const afterRequest = (hook: Hook) => {
    hooks.push(hook);
};

/** Führt alle Hooks aus. Ein Fehler beim Aufräumen ändert die Antwort nicht. */
export async function runAfterRequest(): Promise<void> {
    const results = await Promise.allSettled(hooks.map((hook) => hook()));
    for (const r of results) if (r.status === "rejected") console.error(r.reason);
}
