// netlify/edge-functions/auth.ts
import type {Config, Context} from "@netlify/edge-functions";

const encoder = new TextEncoder();

async function sha256(text: string): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

// Vergleich über Hashes und ohne vorzeitigen Abbruch (gegen Timing-Angriffe)
async function safeEqual(a: string, b: string): Promise<boolean> {
    const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
    let diff = 0;
    for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
    return diff === 0;
}

export default async (request: Request, context: Context) => {
    const user = Netlify.env.get("AUTH_USER");
    const pass = Netlify.env.get("AUTH_PASSWORD");

    // Fehlt die Konfiguration, bleibt alles gesperrt statt offen
    if (!user || !pass) {
        return new Response("Auth ist nicht konfiguriert", {status: 500});
    }

    const header = request.headers.get("Authorization") ?? "";
    if (header.startsWith("Basic ")) {
        try {
            const decoded = atob(header.slice(6));
            const i = decoded.indexOf(":");
            if (i >= 0) {
                const okUser = await safeEqual(decoded.slice(0, i), user);
                const okPass = await safeEqual(decoded.slice(i + 1), pass);
                if (okUser && okPass) return context.next();
            }
        } catch {
            // ungültiger Header: fällt auf 401 durch
        }
    }

    return new Response("Anmeldung erforderlich", {
        status: 401,
        headers: {"WWW-Authenticate": 'Basic realm="Time Manager", charset="UTF-8"'},
    });
};

export const config: Config = {path: "/*"};