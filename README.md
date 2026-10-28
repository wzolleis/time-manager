# Zeiterfassung

## Lokale Umgebung

Lokal läuft die Anwendung mit einer eigenen MariaDB in Docker (OrbStack), nie gegen die Produktion.
Details und Regeln: `features/boundaries/local-environment.md`.

Einmal aufsetzen:

```bash
brew install --cask orbstack && open -a OrbStack
cp .env.local.example .env.local      # Passwörter eintragen
npm run db:up                         # Container time-manager-db, Port 127.0.0.1:3307
npm run db:migrate && npm run db:migrate:test
npm run db:seed && npm run db:seed:test   # Administrator aus scripts/.env.local (API_USER, API_PASSWORD)
```

Im Alltag:

| Befehl                         | Zweck                                                        |
|--------------------------------|--------------------------------------------------------------|
| `npx netlify dev`              | Anwendung auf Port 8888 mit der lokalen Datenbank `time_manager` |
| `npm run dev:test`             | Anwendung auf Port 8889 mit der Testdatenbank `time_manager_test` |
| `scripts/api-walkthrough.sh`   | API-Walkthrough gegen Port 8889 (`-a` ohne Pausen)            |
| `npm run db:down` / `db:up`    | Container stoppen / starten, die Daten bleiben                |
| `npm run db:reset`             | Volume löschen, beide Datenbanken leer (danach migrieren und seeden) |
| `npm run db:migrate:prod`      | Migrationen auf die Produktion, mit `.env.production`         |

## Agent verbinden (MCP)

Ein Agent bedient die Zeiterfassung über den MCP-Server unter `/api/mcp`: stempeln, Buchungen nachtragen,
ändern und löschen, Tages-, Wochen-, Monats- und Jahresbericht. Beschreibung: `features/boundaries/mcp-enable.md`.

1. In der Anwendung unter „Agent-Zugang“ ein Token erzeugen. Es wird nur einmal angezeigt.
2. Den Agent verbinden, z. B. Claude Code:

```bash
claude mcp add --transport http time-manager https://<host>/api/mcp \
  --header "Authorization: Bearer tm_…"
```

Lokal gegen `npx netlify dev` mit `http://localhost:8888/api/mcp`. In einer `.mcp.json` im Repo nie das
Token selbst, sondern eine Variable: `"headers": {"Authorization": "Bearer ${TIME_MANAGER_TOKEN}"}`.
`/mcp` in Claude Code zeigt, ob der Server verbunden ist. Zum Ausprobieren ohne Agent:
`npx @modelcontextprotocol/inspector`.

Andere Clients (Claude API, claude.ai, Claude Desktop): siehe „Einbinden in Claude“ in
`features/boundaries/mcp-enable.md`.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
