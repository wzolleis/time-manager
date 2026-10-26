// shot.config.ts
// Screenshots und Prüfungen mit shot (agent-shot) gegen `netlify dev` (Vite + Functions auf Port 8888).
// Anmeldung mit API_USER und API_PASSWORD aus scripts/.env.local, wie bei npm run db:seed.
import {existsSync, readFileSync} from "node:fs";
import {defineConfig, github} from "agent-shot";
import {parse} from "dotenv";

const CREDENTIALS = "scripts/.env.local";
const fromFile = existsSync(CREDENTIALS) ? parse(readFileSync(CREDENTIALS)) : {};
const password = process.env.API_PASSWORD ?? fromFile.API_PASSWORD ?? "";

export default defineConfig({
    app: {
        url: () => "http://localhost:8888",
        users: {test: "test@zolleis.net"},
        // Ohne Anmeldung zeigt jede URL die Login-Seite, eine eigene /login-Route gibt es nicht
        logIn: async ({page, url, user}) => {
            await page.goto(url);
            await page.fill("#login-email", user);
            await page.fill("#login-password", password);
            // shot erkennt die Login-Seite nicht an der URL, also selbst auf das Cookie warten
            const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"));
            await page.click("button[type=submit]");
            if (!(await response).ok()) throw new Error(`Anmeldung als ${user} fehlgeschlagen`);
            await page.locator("#login-email").waitFor({state: "detached"});
        },
    },
    plugins: [github()],
});
