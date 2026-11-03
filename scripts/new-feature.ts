// scripts/new-feature.ts
// Legt eine neue Beschreibung in features/ an: eine Story (use-case/), einen Change (changes/) oder ein Setup
// (boundaries/), mit Frontmatter (state: open) und den üblichen Überschriften. Aufbau und Felder: Skill
// architecture, use-case.md.
// Aufruf: npm run feature:new [-- <story|change|setup> [<name>]], was fehlt, fragt das Skript.
import {existsSync, writeFileSync} from "node:fs";
import {dirname, join, relative} from "node:path";
import {FEATURES, frontmatter, list, markdownFiles} from "./lib/features.ts";
import {createPrompt, KEBAB, title} from "./lib/prompt.ts";

const DIRS = {story: "use-case", change: "changes", setup: "boundaries"} as const;
type Type = keyof typeof DIRS;
const TYPES = Object.keys(DIRS) as Type[];

// Die vorhandenen Beschreibungen: name → Datei, dazu alle Epics
const existing = new Map<string, string>();
const epics = new Set<string>();
for (const path of markdownFiles(FEATURES)) {
    const fields = frontmatter(path);
    if (fields.name) existing.set(fields.name, path);
    list(fields.epics).forEach((epic) => epics.add(epic));
}

const typeProblem = (type: string) => (TYPES.includes(type as Type) ? null : `Typ ist einer von: ${TYPES.join(", ")}.`);

function nameProblem(type: Type) {
    return (name: string): string | null => {
        if (!name) return "Der Name fehlt.";
        if (!KEBAB.test(name)) return "Nur Kleinbuchstaben, Ziffern und Bindestriche, z. B. weekly-report-krank.";
        if (existing.has(name)) return `Die Beschreibung ${name} gibt es schon: ${existing.get(name)}`;
        if (existsSync(join(FEATURES, DIRS[type], `${name}.md`))) return `Die Datei ${name}.md gibt es schon.`;
        return null;
    };
}

// Ein Change ändert mindestens eine bestehende Story, ohne Angabe von type ist eine Beschreibung eine Story
const stories = [...existing]
    .filter(([, path]) => (frontmatter(path).type || "story") === "story")
    .map(([storyName]) => storyName)
    .sort();

function changesProblem(answer: string): string | null {
    const names = list(answer);
    if (names.length === 0) return "Mindestens einen Use Case angeben, den der Change ändert.";
    const unknown = names.filter((n) => !stories.includes(n));
    return unknown.length > 0 ? `Keine Story: ${unknown.join(", ")}` : null;
}

const descriptionProblem = (answer: string) =>
    answer.length < 20 ? "Bitte in ein bis zwei Sätzen beschreiben, was sich für den User ändert." : null;

function stop(error: string | null) {
    if (!error) return;
    console.error(error);
    process.exit(1);
}

// Optionale Argumente prüfen, bevor gefragt wird
const [argType, argName] = process.argv.slice(2).map((arg) => arg.trim());
if (argType) stop(typeProblem(argType));
if (argName) stop(nameProblem(argType as Type)(argName));

const prompt = createPrompt();
const type = (argType || (await prompt.ask(`Typ (${TYPES.join(", ")}): `, typeProblem))) as Type;
const name = argName || (await prompt.ask("Name (z. B. weekly-report-krank): ", nameProblem(type)));

if (type === "change") console.log(`Vorhandene Stories: ${stories.join(", ")}`);
const changes =
    type === "change" ? list(await prompt.ask("Ändert die Use Cases (kommagetrennt): ", changesProblem)) : [];

console.log(`Vorhandene Epics: ${[...epics].sort().join(", ")}`);
const chosenEpics = list(await prompt.ask("Epics (kommagetrennt, leer für keins): ", () => null));
const description = await prompt.ask("Beschreibung (ein bis zwei Sätze): ", descriptionProblem);
prompt.close();

const file = join(FEATURES, DIRS[type], `${name}.md`);
// Pfad einer anderen Beschreibung, relativ zur neuen Datei, z. B. ../use-case/weekly-report.md
const linkTo = (other: string) => relative(dirname(file), existing.get(other)!).split("\\").join("/");

const header = [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    `type: ${type}`,
    ...(changes.length > 0 ? [`changes: ${changes.join(", ")}`] : []),
    ...(chosenEpics.length > 0 ? [`epics: ${chosenEpics.join(", ")}`] : []),
    "state: open",
    "---",
    "",
    `# ${title(name)}`,
    "",
    "",
].join("\n");

const BODY: Record<Type, string> = {
    story: `„TODO Der User … (die Aufgabe in einem Satz, in der Sprache der Domain)“

TODO Worum es geht und warum der User das braucht.

## Regeln

TODO Die fachlichen Regeln als nummerierte Liste, jede mit kurzer Begründung.

## Beispiele

TODO Eingaben und Ergebnisse als Tabelle, auch die Grenzfälle.

## Umsetzung nach der Architektur

TODO View, Repository, Service, Use Case, Komponente und Endpoint mit Pfaden (Skill architecture).

## Tests

TODO Was getestet wird, mit den Dateien der Tests.
`,
    change: `„TODO Der User … (was sich ändert, in einem Satz, in der Sprache der Domain)“

TODO Was heute gilt und warum es sich ändern soll.

Beschreibung des geänderten Use Case: ${changes.map((c) => `\`${linkTo(c)}\``).join(", ")}.

## Verhalten

TODO Was der User danach sieht und tut, als nummerierte Liste.

## Umsetzung

TODO Die betroffenen Dateien und Schritte als Tabelle (Baustein, Datei, Änderung), dazu Tests und Doku.

## Fertig, wenn

- [ ] TODO Prüfbare Kriterien aus dem Verhalten.
- [ ] Der geänderte Use Case beschreibt den neuen Stand (${changes.join(", ")}).
- [ ] \`state\` steht auf \`resolved\`.
`,
    setup: `TODO Wofür die Voraussetzung gebraucht wird, für die Entwicklung oder den Betrieb.

## Umsetzung

TODO Dateien, Variablen, Befehle und Schritte.

## Fertig, wenn

- [ ] TODO Prüfbare Kriterien.
- [ ] \`state\` steht auf \`resolved\`.
`,
};

writeFileSync(file, header + BODY[type]);
console.log(`Angelegt: ${file}`);
console.log("Als Nächstes die TODOs ausfüllen und die Übersicht neu erzeugen: npm run features:overview");
