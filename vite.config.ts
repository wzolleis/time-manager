import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {tanstackRouter} from "@tanstack/router-plugin/vite";
import {execSync} from "node:child_process";

// Version der Anwendung aus dem Commit, aus dem gebaut wird (features/use-case/version.md)
const git = (args: string) => execSync(`git ${args}`).toString().trim();
const commit = (process.env.COMMIT_REF ?? git("rev-parse HEAD")).slice(0, 7);
// sv-SE liefert "2026-10-23"
const commitDate = new Date(git("log -1 --format=%cI")).toLocaleDateString("sv-SE", {timeZone: "Europe/Berlin"});
const dirty = git("status --porcelain") !== "" ? "-dirty" : "";

// https://vite.dev/config/
export default defineConfig({
    server: {
        port: 3000,
    },
    define: {
        __APP_VERSION__: JSON.stringify(`${commitDate}${dirty}`),
        __APP_COMMIT__: JSON.stringify(commit),
    },
    plugins: [
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        // Weist Vite an, die 'paths' aus der tsconfig.json zu nutzen
        tsconfigPaths: true,
    },
});
