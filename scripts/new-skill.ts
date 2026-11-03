// scripts/new-skill.ts
// Legt einen neuen Skill an: .claude/skills/<name>/SKILL.md mit Frontmatter und den wichtigsten Überschriften.
// Aufruf: npm run skill:new [-- <name>], ohne Namen fragt das Skript danach.
import {existsSync, mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {createInterface} from "node:readline";

const SKILLS = join(".claude", "skills");
// Kleinbuchstaben, Ziffern und Bindestriche, wie die Namen der vorhandenen Skills (z. B. ui-modules)
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LENGTH = 64; // Grenze von Claude Code für den Namen eines Skills

function problem(name: string): string | null {
    if (!name) return "Der Name fehlt.";
    if (name.length > MAX_LENGTH) return `Der Name ist länger als ${MAX_LENGTH} Zeichen.`;
    if (!NAME.test(name)) return "Nur Kleinbuchstaben, Ziffern und Bindestriche, z. B. ui-modules.";
    if (existsSync(join(SKILLS, name))) return `Den Skill ${name} gibt es schon.`;
    return null;
}

// Fragt, bis ein gültiger Name kommt. Liest Zeile für Zeile, damit es auch mit einer Pipe funktioniert.
async function askName(): Promise<string> {
    const rl = createInterface({input: process.stdin, output: process.stdout});
    rl.setPrompt("Name des Skills (z. B. ui-modules): ");
    rl.prompt();
    try {
        for await (const line of rl) {
            const name = line.trim();
            const error = problem(name);
            if (!error) return name;
            console.error(error);
            rl.prompt();
        }
    } finally {
        rl.close();
    }
    console.error("\nAbgebrochen, kein Skill angelegt.");
    process.exit(1);
}

// Überschrift aus dem Namen: "ui-modules" → "Ui Modules", zum Anpassen gedacht
const title = (name: string) =>
    name
        .split("-")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");

const template = (name: string) => `---
name: ${name}
description: TODO Was der Skill beschreibt. Verwenden beim …, beim … und vor jedem Commit mit ….
---

# ${title(name)}

TODO Worum es geht, in ein bis zwei Sätzen. Wofür der Skill gilt und wofür nicht (Verweis auf andere Skills).

# Regeln

TODO Die Regeln als Liste, jede mit kurzer Begründung.

# Beispiele aus dem Projekt

TODO Wo die Regeln schon umgesetzt sind, mit Pfaden.

# Prüfung vor dem Commit

TODO Was vor jedem Commit geprüft wird und was bei einem Verstoß passiert.
`;

const arg = process.argv[2]?.trim();
let name: string;
if (arg) {
    const error = problem(arg);
    if (error) {
        console.error(error);
        process.exit(1);
    }
    name = arg;
} else {
    name = await askName();
}

const dir = join(SKILLS, name);
const file = join(dir, "SKILL.md");
mkdirSync(dir, {recursive: true});
writeFileSync(file, template(name));
console.log(`Angelegt: ${file}`);
console.log("Als Nächstes die TODOs ausfüllen, vor allem description: Sie entscheidet, wann der Skill geladen wird.");
