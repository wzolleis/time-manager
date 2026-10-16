import {AsyncLocalStorage} from "node:async_hooks";
import type {Context} from "@netlify/functions";

type Mark = {name: string; ms: number};
type Handler = (req: Request, context: Context) => Promise<Response>;

const storage = new AsyncLocalStorage<Mark[]>();
let coldStart = true; // gilt nur für den ersten Aufruf dieser Function-Instanz

const round = (ms: number) => Math.round(ms * 10) / 10;

/** Misst einen Schritt und trägt ihn in die laufende Anfrage ein */
export async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
        return await fn();
    } finally {
        storage.getStore()?.push({name, ms: round(performance.now() - start)});
    }
}

/** Umhüllt einen Handler: Gesamtzeit, Kaltstart-Flag, Log-Zeile und Server-Timing-Header */
export function withTiming(name: string, handler: Handler): Handler {
    return async (req, context) => {
        const cold = coldStart;
        coldStart = false;

        const marks: Mark[] = [];
        const start = performance.now();
        const res = await storage.run(marks, () => handler(req, context));
        const total = round(performance.now() - start);

        console.log(
            `[timing] ${JSON.stringify({
                fn: name,
                method: req.method,
                path: new URL(req.url).pathname,
                status: res.status,
                cold,
                totalMs: total,
                marks,
            })}`,
        );

        // Im Browser sichtbar: Entwicklertools → Network → Anfrage → Timing
        const parts = marks.map((m, i) => {
            const label = m.name.split(":")[0].replace(/[^a-zA-Z0-9_.-]/g, "_");
            return `${i}-${label};dur=${m.ms}`;
        });
        try {
            res.headers.set("Server-Timing", [`total;dur=${total}`, ...parts, `cold;desc=${cold}`].join(", "));
        } catch {
            // Header nicht änderbar: dann bleibt es beim Log
        }
        return res;
    };
}
