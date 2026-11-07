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

Ein Agent bedient die Zeiterfassung über den MCP-Server unter `/api/mcp`: stempeln, Buchungen oder ganze
Tage nachtragen, ändern und löschen, Tages-, Wochen-, Monats- und Jahresbericht. Beschreibung: `features/boundaries/mcp-enable.md`.

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

## Backup der Datenbank

Jede Nacht und auf Knopfdruck unter Administration → Backups entsteht ein SQL-Dump. Er wird mit gzip komprimiert,
mit `age` verschlüsselt und per FTPS abgelegt. „Auf diesen Rechner kopieren“ lädt das neueste Backup herunter.
Beschreibung: `features/use-case/database-backup.md`.

Netlify-Variablen (nur Production): `BACKUP_FTP_HOST`, `BACKUP_FTP_PORT` (Standard 21), `BACKUP_FTP_USER`,
`BACKUP_FTP_PASSWORD` (Secret), `BACKUP_AGE_RECIPIENT` (öffentlicher Schlüssel `age1…`). Den privaten Schlüssel
hat nur der Administrator.

Lokal läuft ein FTPS-Container statt des echten Speichers:

```bash
npm run ftps:up            # Container time-manager-ftps auf 127.0.0.1:2121, Zertifikat beim ersten Mal
npm run dev:backup         # wie npx netlify dev, vertraut dem lokalen Zertifikat
```

### Restore per Skript

```bash
npm run backup:restore -- <datei> <schlüsseldatei>        # lokal, nach time_manager_restore
npm run backup:restore:prod -- <datei> <schlüsseldatei>   # Produktion, nur im Notfall
```

Das Skript prüft die Datei vor der ersten Änderung, vergleicht danach die Zeilen je Tabelle und verlangt für die
Produktion den Namen der Datenbank. Vorher sichert es den aktuellen Stand verschlüsselt nach `backups/`.

### Restore von Hand

Für den Fall, dass das Skript nicht läuft, z. B. auf einem Rechner ohne das Projekt:

1. Die neueste Datei vom Backup-Speicher oder aus der lokalen Kopie nehmen.
2. Entschlüsseln und entpacken, dafür muss `age` installiert sein (`brew install age`):
   `age -d -i <schlüsseldatei> <datei> | gunzip > dump.sql`
3. Vor dem Einspielen in die Produktion den aktuellen Stand sichern, mit „Backup jetzt erstellen“ oder in phpMyAdmin.
4. Einspielen mit `mariadb -h <host> -P <port> -u <user> -p <datenbank> < dump.sql` oder in phpMyAdmin unter
   „Importieren“. Der Dump löscht und erstellt die Tabellen neu.
5. Wurde seit dem Backup migriert: `npm run db:migrate:prod`.
6. Prüfen: Zeilenzahlen (die zweite Zeile im Dump, `-- rows {…}`), Umlaute, Anmeldung. Alle User melden sich neu an.
7. `dump.sql` löschen, die Datei ist unverschlüsselt.

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
