// scripts/features-overview.ts
// Erzeugt features/overview.md aus dem Frontmatter der Beschreibungen in features/ (name, type, epics, state).
// Aufruf: node scripts/features-overview.ts
import {readdirSync, readFileSync, writeFileSync} from "node:fs";
import {join, relative} from "node:path";

const FEATURES = "features";
const OUTPUT = join(FEATURES, "overview.md");
const NO_EPIC = "(ohne Epic)";
const STATE_ORDER = ["open", "resolved"];

type Description = {name: string; type: string; epics: string[]; state: string; link: string};

function markdownFiles(dir: string): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return markdownFiles(path);
        return entry.name.endsWith(".md") && path !== OUTPUT ? [path] : [];
    });
}

// Das Frontmatter besteht nur aus Zeilen "key: value", dafür reicht ein einfacher Parser
function frontmatter(path: string): Record<string, string> {
    const match = readFileSync(path, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) throw new Error(`${path}: kein Frontmatter`);
    const fields: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
        const sep = line.indexOf(":");
        if (sep > 0) fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }
    return fields;
}

function describe(path: string): Description {
    const fields = frontmatter(path);
    if (!fields.name) throw new Error(`${path}: name fehlt`);
    if (!fields.state) throw new Error(`${path}: state fehlt`);
    const epics = (fields.epics ?? "")
        .split(",")
        .map((epic) => epic.trim())
        .filter(Boolean);
    return {
        name: fields.name,
        // ohne Angabe ist ein Use Case eine Story
        type: fields.type || "story",
        epics: epics.length > 0 ? epics : [NO_EPIC],
        state: fields.state,
        link: relative(FEATURES, path).split("\\").join("/"),
    };
}

// unbekannte Status stehen hinter den bekannten
function stateRank(state: string): number {
    const rank = STATE_ORDER.indexOf(state);
    return rank === -1 ? STATE_ORDER.length : rank;
}

function byStateThenName(a: Description, b: Description): number {
    return stateRank(a.state) - stateRank(b.state) || a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
}

function table(header: string[], rows: string[][]): string {
    return [header, header.map(() => "---"), ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n");
}

const descriptions = markdownFiles(FEATURES).map(describe);
const nameLink = (d: Description) => `[${d.name}](${d.link})`;

const byState = [...descriptions].sort(byStateThenName).map((d) => [nameLink(d), d.state, d.type]);

const byEpic = descriptions
    .flatMap((d) => d.epics.map((epic) => ({epic, d})))
    .sort((a, b) => a.epic.localeCompare(b.epic) || byStateThenName(a.d, b.d))
    .map(({epic, d}) => [epic, nameLink(d), d.type, d.state]);

const content = `# Übersicht: Use Cases und Changes

> **Nicht manuell bearbeiten.** Diese Datei wird mit \`node scripts/features-overview.ts\` aus dem Frontmatter
> der Beschreibungen in \`features/\` erzeugt (\`name\`, \`type\`, \`epics\`, \`state\`). Änderungen gehören in die
> jeweilige Beschreibung; danach das Skript erneut ausführen.

## Nach Status

Zuerst die offenen, danach die erledigten, jeweils nach Name sortiert.

${table(["Name", "Status", "Typ"], byState)}

## Nach Epic

Nach Epic sortiert, innerhalb eines Epics die offenen zuerst. Eine Beschreibung mit mehreren Epics steht bei jedem
ihrer Epics.

${table(["Epic", "Name", "Typ", "Status"], byEpic)}
`;

writeFileSync(OUTPUT, content);
console.log(`${OUTPUT}: ${descriptions.length} Beschreibungen`);
