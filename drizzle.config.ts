// drizzle.config.ts
import "dotenv/config";
import {defineConfig} from "drizzle-kit";

export default defineConfig({
    dialect: "mysql",
    schema: "./db/schema.ts",
    out: "./db/migrations",
    dbCredentials: {
        host: process.env.DB_HOST!,
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,
    },
});
