// scripts/lib/features.ts
// Liest die Beschreibungen in features/ (Use Cases, Changes, Setups) und ihr Frontmatter.
import {readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";

export const FEATURES = "features";

export function markdownFiles(dir: string): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return markdownFiles(path);
        return entry.name.endsWith(".md") ? [path] : [];
    });
}

// Das Frontmatter besteht nur aus Zeilen "key: value", dafür reicht ein einfacher Parser
export function frontmatter(path: string): Record<string, string> {
    const match = readFileSync(path, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) throw new Error(`${path}: kein Frontmatter`);
    const fields: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
        const sep = line.indexOf(":");
        if (sep > 0) fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }
    return fields;
}

/** "report, feiertage" → ["report", "feiertage"] */
export const list = (value: string | undefined): string[] =>
    (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
