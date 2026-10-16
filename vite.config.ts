import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {tanstackRouter} from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
    server: {
        port: 3000,
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
