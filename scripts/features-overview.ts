// scripts/features-overview.ts
// Erzeugt generated/overview.md aus dem Frontmatter der Beschreibungen in features/ (name, type, epics, state).
// Aufruf: node scripts/features-overview.ts
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, join, relative} from "node:path";
import {FEATURES, frontmatter, list, markdownFiles} from "./lib/features.ts";

// generiert, nicht im Git (.gitignore)
const OUTPUT = join("generated", "overview.md");
const NO_EPIC = "(ohne Epic)";
const STATE_ORDER = ["open", "later", "resolved"];

type Description = {name: string; type: string; epics: string[]; state: string; link: string};

function describe(path: string): Description {
    const fields = frontmatter(path);
    if (!fields.name) throw new Error(`${path}: name fehlt`);
    if (!fields.state) throw new Error(`${path}: state fehlt`);
    const epics = list(fields.epics);
    return {
        name: fields.name,
        // ohne Angabe ist ein Use Case eine Story
        type: fields.type || "story",
        epics: epics.length > 0 ? epics : [NO_EPIC],
        state: fields.state,
        link: relative(dirname(OUTPUT), path).split("\\").join("/"),
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

// Ortszeit, z. B. "22.10.2026, 23:15 Uhr"
function timestamp(now: Date): string {
    const two = (n: number) => String(n).padStart(2, "0");
    const day = `${two(now.getDate())}.${two(now.getMonth() + 1)}.${now.getFullYear()}`;
    return `${day}, ${two(now.getHours())}:${two(now.getMinutes())} Uhr`;
}

function table(header: string[], rows: string[][]): string {
    return [header, header.map(() => "---"), ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n");
}

const descriptions = markdownFiles(FEATURES).map(describe);
const nameLink = (d: Description) => `[${d.name}](${d.link})`;

const byState = [...descriptions].sort(byStateThenName).map((d) => [nameLink(d), d.state, d.type]);

// Markdown kann keine Zellen verbinden: das Epic steht nur in der ersten Zeile seiner Gruppe
const byEpic = descriptions
    .flatMap((d) => d.epics.map((epic) => ({epic, d})))
    .sort((a, b) => a.epic.localeCompare(b.epic) || byStateThenName(a.d, b.d))
    .map(({epic, d}, i, rows) => [i > 0 && rows[i - 1].epic === epic ? "" : epic, nameLink(d), d.type, d.state]);

const content = `> **Erzeugt am ${timestamp(new Date())}** mit \`npm run features:overview\`.
>
> **Nicht von Hand bearbeiten.** Diese Datei wird aus dem Frontmatter der Beschreibungen in \`features/\` erzeugt
> (\`name\`, \`type\`, \`epics\`, \`state\`) und bei jedem Lauf überschrieben. Änderungen gehören in die jeweilige
> Beschreibung; danach das Skript erneut ausführen.

# Übersicht: Use Cases und Changes

## Nach Status

Zuerst die offenen, dann die zurückgestellten, danach die erledigten, jeweils nach Name sortiert.

${table(["Name", "Status", "Typ"], byState)}

## Nach Epic

Nach Epic sortiert, das Epic steht nur in der ersten Zeile seiner Gruppe. Innerhalb eines Epics die offenen zuerst,
dann nach Name. Eine Beschreibung mit mehreren Epics steht bei jedem ihrer Epics.

${table(["Epic", "Name", "Typ", "Status"], byEpic)}
`;

mkdirSync(dirname(OUTPUT), {recursive: true});
writeFileSync(OUTPUT, content);
console.log(`${OUTPUT}: ${descriptions.length} Beschreibungen`);
