// scripts/lib/prompt.ts
// Fragen auf der Konsole für die Skripte, die Dateien anlegen (new-skill, new-feature).
import {createInterface} from "node:readline";

// Kleinbuchstaben, Ziffern und Bindestriche, wie die Namen der Skills und Beschreibungen (z. B. ui-modules)
export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Überschrift aus dem Namen: "ui-modules" → "Ui Modules", zum Anpassen gedacht
export const title = (name: string) =>
    name
        .split("-")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");

/** Prüft eine Antwort, null = gültig, sonst die Meldung, nach der erneut gefragt wird */
export type Check = (answer: string) => string | null;

/**
 * Fragt Zeile für Zeile, auch mit einer Pipe (printf 'a\nb\n' | npm run …). Alle Fragen teilen sich eine
 * Eingabe, sonst gingen bei einer Pipe die Zeilen verloren, die eine frühere Frage schon gelesen hat.
 */
export function createPrompt() {
    const rl = createInterface({input: process.stdin, output: process.stdout});
    const lines = rl[Symbol.asyncIterator]();

    /** Fragt, bis check die Antwort annimmt. Endet die Eingabe vorher, bricht das Skript ab. */
    async function ask(question: string, check: Check): Promise<string> {
        for (;;) {
            process.stdout.write(question);
            const next = await lines.next();
            if (next.done) {
                console.error("\nAbgebrochen, nichts angelegt.");
                process.exit(1);
            }
            const answer = String(next.value).trim();
            const error = check(answer);
            if (!error) return answer;
            console.error(error);
        }
    }

    return {ask, close: () => rl.close()};
}
