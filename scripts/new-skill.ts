// scripts/new-skill.ts
// Legt einen neuen Skill an: .claude/skills/<name>/SKILL.md mit Frontmatter und den wichtigsten Überschriften.
// Aufruf: npm run skill:new [-- <name>], ohne Namen fragt das Skript danach.
import {existsSync, mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {createPrompt, KEBAB, title} from "./lib/prompt.ts";

const SKILLS = join(".claude", "skills");
const MAX_LENGTH = 64; // Grenze von Claude Code für den Namen eines Skills

function problem(name: string): string | null {
    if (!name) return "Der Name fehlt.";
    if (name.length > MAX_LENGTH) return `Der Name ist länger als ${MAX_LENGTH} Zeichen.`;
    if (!KEBAB.test(name)) return "Nur Kleinbuchstaben, Ziffern und Bindestriche, z. B. ui-modules.";
    if (existsSync(join(SKILLS, name))) return `Den Skill ${name} gibt es schon.`;
    return null;
}

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
    const prompt = createPrompt();
    name = await prompt.ask("Name des Skills (z. B. ui-modules): ", problem);
    prompt.close();
}

const dir = join(SKILLS, name);
const file = join(dir, "SKILL.md");
mkdirSync(dir, {recursive: true});
writeFileSync(file, template(name));
console.log(`Angelegt: ${file}`);
console.log("Als Nächstes die TODOs ausfüllen, vor allem description: Sie entscheidet, wann der Skill geladen wird.");
