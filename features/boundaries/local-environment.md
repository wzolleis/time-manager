---
name: local-environment
description: Beschreibt die lokale Umgebung mit eigener MariaDB-Datenbank in Docker (wie die Produktion, MariaDB 10.11). Die lokale Datenbank time_manager wird von npx netlify dev, den Skripten und den Migrationen verwendet, die Testdatenbank time_manager_test vom API-Walkthrough. Enthält Dateien, Variablen in .env.local, Befehle, Regeln zum Schutz der Produktion und die Schritte der Umsetzung.
---

# Lokale Umgebung

„Der Entwickler arbeitet und testet lokal, ohne die Daten der Produktion zu berühren.“

Der Entwickler startet die Anwendung mit `npx netlify dev`. Sie verbindet sich mit einer eigenen
MariaDB-Datenbank in einem Docker-Container. Migrationen, Skripte und `scripts/api-walkthrough.sh` laufen
ebenfalls gegen diesen Container.

Die Umgebung ist **noch nicht umgesetzt**. Diese Beschreibung ist der Auftrag dafür.

## Ausgangslage

Wichtig, weil sie heute ein Risiko ist:

- **`.env` im Projektverzeichnis enthält die Zugangsdaten der Produktion** (`DB_HOST`, `DB_PORT`,
  `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
  - `npx netlify dev` nimmt sie aus `.env` (Log: `Injected .env file env vars: DB_HOST, …`).
  - Auch `drizzle.config.ts`, `scripts/migrate.ts`, `scripts/grant-admin.ts`, `scripts/set-password.ts`
    und `scripts/check-schema.ts` nehmen sie aus `.env` (`import "dotenv/config"`).
  - Deshalb laufen `npx netlify dev`, `npm run db:migrate` und `scripts/api-walkthrough.sh` heute gegen
    die Produktion.
- Die Netlify-Projekteinstellungen enthalten dieselben Variablen. `netlify dev` ignoriert sie, wenn
  sie lokal definiert sind (Log: `Ignored project settings env var: DB_HOST (defined in .env file)`).
- Die Produktion ist **MariaDB 10.11.19** (`10.11.19-MariaDB-deb12`) auf einem Shared Hosting
  (`connectionLimit: 1` in
  `netlify/functions/lib/db.ts`).
- Auf dem Rechner ist Docker noch nicht installiert (`docker: command not found`). Es wird OrbStack.
- Unit-Tests (`npm run test:run`) brauchen keine Datenbank, daran ändert sich nichts.

## Entscheidungen

| Frage                         | Entscheidung                                                                                   |
|-------------------------------|------------------------------------------------------------------------------------------------|
| Womit läuft Docker?           | OrbStack (`brew install --cask orbstack`), siehe „Docker installieren“                         |
| Wo läuft die Datenbank?       | Docker-Container `time-manager-db` mit `docker compose`, Datei `compose.yaml` im Projektverzeichnis |
| Läuft er von selbst?          | Ja, `restart: unless-stopped`: OrbStack startet beim Login, der Container mit. Nach `db:down` bleibt er aus |
| Welche Version?               | Image `mariadb:10.11`, dieselbe LTS-Reihe wie die Produktion (10.11.19). Patch-Versionen kommen mit `docker compose pull` |
| Bleiben die Daten erhalten?   | Ja, im benannten Volume `time-manager-mariadb`. `docker compose down` behält es, nur `db:reset` löscht es |
| Wie erreichbar?               | Port `127.0.0.1:3307` → `3306` im Container: nur vom eigenen Rechner, kein Konflikt mit einem lokal installierten MySQL oder MariaDB auf 3306 |
| Welche Datenbanken?           | `time_manager` für die Entwicklung, `time_manager_test` für den API-Walkthrough, beide im selben Container mit demselben User |
| Woher kommen die Zugangsdaten? | Aus `.env.local` im Projektverzeichnis, nicht eingecheckt. Vorlage `.env.local.example` ist eingecheckt |
| Was passiert mit `.env`?      | Wird in `.env.production` umbenannt. Sie wird nur mit `APP_ENV=production` geladen, z. B. für `npm run db:migrate:prod` |
| Was gewinnt?                  | Umgebungsvariable im Prozess vor der Datei (`.env.local`, mit `APP_ENV=production` nur `.env.production`) |

## Begriffe

| Begriff            | Bedeutung                                                                         |
|--------------------|-----------------------------------------------------------------------------------|
| Produktion         | Die MariaDB-Datenbank auf dem Hosting, Zugangsdaten in `.env.production` und in Netlify |
| Lokale Datenbank   | `time_manager` im Container, für `npx netlify dev` und das Ausprobieren in der UI |
| Testdatenbank      | `time_manager_test` im selben Container, für `scripts/api-walkthrough.sh`, darf jederzeit geleert werden |
| Container          | Der Docker-Container `time-manager-db` mit MariaDB                                |
| Volume             | Der Speicher `time-manager-mariadb` des Containers, darin liegen die Daten           |

## Dateien

| Datei                              | Eingecheckt | Inhalt                                                                  |
|------------------------------------|-------------|-------------------------------------------------------------------------|
| `compose.yaml`                     | ja          | Service `db`, Image, Port, Volume, Healthcheck, Init-Skript              |
| `db/docker/init/01-test-db.sh`     | ja          | legt beim ersten Start `time_manager_test` an und gibt `DB_USER` die Rechte |
| `.env.local.example`               | ja          | Vorlage für `.env.local` mit Platzhaltern, ohne echte Passwörter         |
| `.env.local`                       | nein        | die echten lokalen Werte, siehe „Variablen“                              |
| `.env.production`                  | nein        | die bisherige `.env` mit den Zugangsdaten der Produktion, nur umbenannt  |
| `scripts/lib/env.ts`               | ja          | lädt `.env.local`, mit `APP_ENV=production` stattdessen `.env.production`; für alle Node-Skripte und `drizzle.config.ts` |
| `scripts/seed-local.ts`            | ja          | legt den ersten Administrator in einer leeren lokalen Datenbank an       |
| `scripts/.env.local`               | nein        | gibt es schon: `API_USER`, `API_PASSWORD` für den Walkthrough            |

`.gitignore` ignoriert schon `.env` und `.env.*`, also auch `.env.production`. Für die Vorlage kommt die
Ausnahme `!.env.local.example` dazu. Eine Datei `.env` gibt es danach nicht mehr.

## Variablen in `.env.local`

```dotenv
# Lokale Datenbank im Docker-Container (compose.yaml)
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=time_manager
DB_PASSWORD=<frei wählbar>
DB_NAME=time_manager
DB_TEST_NAME=time_manager_test
DB_ROOT_PASSWORD=<frei wählbar>
```

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` heißen wie in `.env.production`, am Code der
  Functions ändert sich nichts.
- `compose.yaml` setzt daraus die Variablen des MariaDB-Images: `MARIADB_DATABASE: ${DB_NAME}`,
  `MARIADB_USER: ${DB_USER}`, `MARIADB_PASSWORD: ${DB_PASSWORD}`, `MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}`,
  `DB_TEST_NAME: ${DB_TEST_NAME}` für das Init-Skript.
  - `docker compose` liest von sich aus nur `.env` (die es dann nicht mehr gibt). Deshalb rufen die npm-Skripte es immer mit
    `--env-file .env.local` auf.
  - Das ist bewusst so, sonst kämen die Werte der Produktion in den Container.
- Die Werte zählen nur beim **ersten** Start mit leerem Volume, so arbeitet das MariaDB-Image. Ein
  geändertes Passwort braucht `npm run db:reset`.
- Werte fest vorzugeben ist erlaubt (die Vorlage enthält Vorschläge), die Quelle ist trotzdem immer
  `.env.local`.

## Befehle

Neue npm-Skripte in `package.json`:

| Skript                 | Befehl                                                                      | Zweck                                       |
|------------------------|-----------------------------------------------------------------------------|---------------------------------------------|
| `db:up`                | `docker compose --env-file .env.local up -d --wait`                         | Container starten, wartet auf den Healthcheck |
| `db:down`              | `docker compose --env-file .env.local down`                                 | Container stoppen, Daten bleiben            |
| `db:reset`             | `docker compose --env-file .env.local down -v && npm run db:up`             | Volume löschen, beide Datenbanken neu und leer |
| `db:migrate`           | `drizzle-kit migrate` (wie bisher, liest jetzt `.env.local`)                 | Migrationen auf die lokale Datenbank         |
| `db:migrate:prod`      | `APP_ENV=production drizzle-kit migrate`                                     | Migrationen auf die Produktion               |
| `db:migrate:test`      | `DB_NAME=time_manager_test drizzle-kit migrate`, über `DB_TEST_NAME`        | Migrationen auf die Testdatenbank            |
| `db:seed`              | `node scripts/seed-local.ts`                                                | ersten Administrator anlegen                 |
| `dev:test`             | `DB_NAME=time_manager_test netlify dev --port 8889`, über `DB_TEST_NAME`    | Anwendung gegen die Testdatenbank           |

`DB_NAME=… ` vor dem Befehl ist eine Umgebungsvariable im Prozess. Sie gewinnt gegen die Datei. So
zeigen `db:migrate:test` und `dev:test` auf die Testdatenbank, ohne eine zweite Datei.

Die übrigen Skripte laufen genauso gegen die Produktion, z. B.
`APP_ENV=production node scripts/grant-admin.ts <email>`.

### Docker installieren

Einmal pro Rechner, macht der Entwickler (Mac mit Apple Silicon, Homebrew ist installiert):

```bash
brew install --cask orbstack
open -a OrbStack                     # einmal öffnen, richtet docker und docker compose ein
docker --version
docker compose version
docker run --rm hello-world          # Docker läuft
```

- In OrbStack unter Settings → „Start at login“ einschalten, damit die Datenbank nach einem Neustart
  ohne Zutun da ist.
- OrbStack ist für die private Nutzung kostenlos, im Unternehmen kostenpflichtig.
- Docker Desktop oder Colima funktionieren mit derselben `compose.yaml`, sind hier aber nicht
  vorgesehen.

### Erstes Aufsetzen

```bash
cp .env.local.example .env.local     # Passwörter eintragen
npm run db:up
npm run db:migrate                    # time_manager
npm run db:migrate:test               # time_manager_test
npm run db:seed                       # Administrator aus scripts/.env.local in time_manager
DB_NAME=time_manager_test npm run db:seed   # und in time_manager_test
npx netlify dev
```

### Walkthrough gegen die Testdatenbank

```bash
npm run dev:test                                           # eigenes Terminal, Port 8889
BASE_URL=http://localhost:8889 scripts/api-walkthrough.sh -a
```

Dabei bleiben die lokale Entwicklung auf 8888 und ihre Daten unberührt, beide Server können gleichzeitig
laufen.

## Regeln

1. **Nie versehentlich gegen die Produktion.** Ohne `APP_ENV=production` sieht kein Befehl die
   Zugangsdaten der Produktion. `db:seed`, `db:reset` und der Walkthrough laufen nur, wenn `DB_HOST`
   `127.0.0.1` oder `localhost` ist.
   - `scripts/seed-local.ts` prüft das selbst und bricht sonst mit einer Meldung ab, auch mit
     `APP_ENV=production`.
   - `netlify/functions/lib/db.ts` bricht unter `netlify dev` (`NETLIFY_DEV=true`) mit einer Meldung ab,
     wenn `DB_HOST` nicht lokal ist. Sonst würde `netlify dev` ohne `.env.local` auf die
     Netlify-Projekteinstellungen zurückfallen, und das ist die Produktion. Dass `netlify dev`
     `NETLIFY_DEV` setzt, bei der Umsetzung prüfen.
   - Ein Agent führt einen Befehl mit `APP_ENV=production` nur auf ausdrücklichen Wunsch aus.
   - Ein Agent prüft es vor jedem dieser Befehle: beim Start von `netlify dev` die Zeile
     `Injected .env.local file env vars: DB_HOST, …`, bei Skripten deren Ausgabe des Ziels.
   - Ein Agent gibt dabei nie Passwörter aus, nur Namen von Variablen und Host/Port.
2. **Eine Datei je Umgebung.**
   - Node-Skripte und `drizzle.config.ts` laden statt `import "dotenv/config"` die Datei
     `scripts/lib/env.ts`.
   - Sie ruft `config({path: process.env.APP_ENV === "production" ? ".env.production" : ".env.local",
     quiet: true})` auf (dotenv 18). Eine gesetzte Umgebungsvariable gewinnt immer.
   - Fehlt die Datei, bricht das Skript mit einem Hinweis ab, statt ohne Zugangsdaten weiterzumachen.
   - `netlify dev` lädt `.env`-Dateien selbst und kennt `APP_ENV` nicht.
     - Dass es `.env.local` liest, wird bei der Umsetzung mit dem Log geprüft (Abschnitt „Prüfen“).
     - Liest es sie nicht, kommen die lokalen Werte in eine neue `.env`. Sie ist dann nur noch lokal,
       weil die Produktion in `.env.production` liegt.
3. **Persistent.** Die Daten liegen im Volume und überstehen `db:down`, einen Neustart des Rechners und
   ein neues Image. Nur `db:reset` (`down -v`) löscht sie. Ein Agent führt `db:reset` nur auf
   ausdrücklichen Wunsch aus.
4. **Von außen einsehbar.** Solange der Container läuft, erreicht man ihn auf `127.0.0.1:3307` mit
   `DB_USER`/`DB_PASSWORD`, z. B. in IntelliJ: Database → `+` → Data Source → MariaDB, Host `127.0.0.1`,
   Port `3307`, User und Passwort aus `.env.local`, Database `time_manager` oder `time_manager_test`.
   IntelliJ liest `.env.local` nicht, die Werte trägt der Entwickler einmal ein.
5. **Nur der eigene Rechner.** Der Port ist an `127.0.0.1` gebunden, nicht an `0.0.0.0`.
6. **Gleiches Verhalten wie die Produktion.**
   - MariaDB 10.11 wie die Produktion. Kein MySQL 8, weil es sich in Details unterscheidet, z. B. bei
     Collations, `JSON` und Fehlercodes. `mysql2` und Drizzle (`dialect: "mysql"`) arbeiten mit beiden.
   - Zeichensatz und Collation wie die Produktion: Der Server der Produktion hat `latin1` und
     `latin1_swedish_ci` (`character_set_server`, `collation_server`). Lokal steht dasselbe in `command`.
   - Die Migrationen geben keinen Zeichensatz an. Tabellen und Spalten erben ihn also von der Datenbank,
     und die Datenbank erbt ihn beim Anlegen vom Server. Lokal werden `time_manager` (vom Image) und
     `time_manager_test` (vom Init-Skript) so mit `latin1` angelegt wie in der Produktion.
   - Folge von `latin1` (bei MariaDB eigentlich cp1252): Umlaute, `ß` und `€` gehen, Emojis oder
     kyrillische und chinesische Namen nicht. Lokal fällt das genauso auf wie in der Produktion. Das ist gewollt.
   - Zeitzone `+00:00` (`--default-time-zone=+00:00`), weil die Anwendung in UTC speichert und
     `Europe/Berlin` erst beim Anzeigen rechnet.
   - Das Schema entsteht nur durch die Migrationen, nie durch `drizzle-kit push`.
7. **Leere Datenbank, dann Seed.** Nach den Migrationen gibt es die Rollen (`0006_roles_seed.sql`), aber
   keinen User.
   - `scripts/seed-local.ts` legt den User aus `API_USER`/`API_PASSWORD` in `scripts/.env.local` an.
     Das Passwort wird mit bcrypt gehasht wie in `netlify/functions/lib/password.ts`.
   - Er bekommt die Rollen „User“ und „Administrator“, damit der Walkthrough sofort läuft.
   - Gibt es den User schon, ändert das Skript nichts und meldet das.
8. **Testdatenbank ist Wegwerfware.** Der Walkthrough räumt hinterher auf. Bleibt nach einem Abbruch
   etwas übrig, darf man die Testdatenbank jederzeit leeren. Dafür gibt es keinen eigenen Befehl:
   `DROP DATABASE`/`CREATE DATABASE` in IntelliJ, dann `db:migrate:test` und Seed.

## Umsetzung

Reihenfolge, jeder Schritt ist ein eigener Commit:

1. **Vorbereiten**, macht der Entwickler, ein Agent tut das nicht selbst:
   - OrbStack installieren, siehe „Docker installieren“.
   - `.env` in `.env.production` umbenennen (`mv .env .env.production`). Ab dann starten
     `npx netlify dev` und die Skripte erst wieder nach Schritt 3 mit `.env.local`.
2. **`compose.yaml`, `db/docker/init/01-test-db.sh`, `.env.local.example`, Ausnahme in `.gitignore`,
   npm-Skripte `db:up`, `db:down`, `db:reset`.**
   - Healthcheck: `healthcheck.sh` aus dem MariaDB-Image, damit `--wait` erst zurückkommt, wenn die
     Datenbank bereit ist. Den User dafür legt das Image beim ersten Start selbst an.
   - Das Init-Skript läuft nur beim ersten Start mit leerem Volume (Verhalten des MariaDB-Images).
   - Das Image enthält den Client `mariadb`, nicht `mysql`.
   - Vorlage `compose.yaml`:
     ```yaml
     services:
       db:
         image: mariadb:10.11
         container_name: time-manager-db
         restart: unless-stopped
         command:
           - --default-time-zone=+00:00
           - --character-set-server=latin1      # wie die Produktion
           - --collation-server=latin1_swedish_ci
         environment:
           MARIADB_DATABASE: ${DB_NAME}
           MARIADB_USER: ${DB_USER}
           MARIADB_PASSWORD: ${DB_PASSWORD}
           MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
           DB_TEST_NAME: ${DB_TEST_NAME}
         ports:
           - "127.0.0.1:${DB_PORT:-3307}:3306"
         volumes:
           - time-manager-mariadb:/var/lib/mysql
           - ./db/docker/init:/docker-entrypoint-initdb.d:ro
         healthcheck:
           test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
           interval: 5s
           retries: 20

     volumes:
       time-manager-mariadb:
     ```
   - Vorlage `db/docker/init/01-test-db.sh` (ausführbar, `chmod +x`):
     ```bash
     #!/bin/bash
     set -e
     mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" <<SQL
     CREATE DATABASE IF NOT EXISTS \`$DB_TEST_NAME\`;
     GRANT ALL ON \`$DB_TEST_NAME\`.* TO '$MARIADB_USER'@'%';
     SQL
     ```
3. **`scripts/lib/env.ts`** und alle `import "dotenv/config"` (`drizzle.config.ts`, `scripts/*.ts`)
   darauf umstellen, dazu `db:migrate:test` und `db:migrate:prod`. Jedes Skript gibt beim Start
   `DB_HOST:DB_PORT/DB_NAME` aus, ohne Passwort. Dazu die Prüfung unter `netlify dev` in
   `netlify/functions/lib/db.ts` (Regel 1).
4. **`scripts/seed-local.ts`** und `db:seed`, mit der Prüfung aus Regel 1.
5. **`dev:test`** und das Aufräumen im Walkthrough. Danach den Walkthrough gegen Port 8889 einmal ganz
   durchlaufen lassen.
   - `purge_user` in `scripts/api-walkthrough.sh` prüft heute keinen Status. Scheitert das Löschen
     des Test-Users eines früheren Laufs, geht es ohne Meldung weiter, und Schritt 5 scheitert mit
     einem irreführenden `409 Diese E-Mail existiert bereits`.
   - Künftig bricht `purge_user` beim ersten Status außer `204`/`410` mit dem Aufruf und der Antwort ab.
   - Es löscht vor dem User auch dessen eigene Feiertage (`GET /api/holidays?userId=…`, nur die mit
     `userId`). `holidays.user_id` hat kein `onDelete: cascade` und würde das Löschen sonst blockieren.
6. **Doku:** Abschnitt „Lokale Umgebung“ in `README.md` mit „Erstes Aufsetzen“. Im Skill `architecture`
   (`testing.md`) der Hinweis, dass der Walkthrough gegen `dev:test` läuft.

## Prüfen

Nach der Umsetzung, ohne Unit-Tests, weil alles davon Docker und die DB braucht:

- `npm run db:up` zweimal hintereinander: der zweite Aufruf ändert nichts, beide enden mit „Healthy“.
- OrbStack beenden und wieder öffnen: Der Container läuft wieder, ohne `db:up`. Nach `db:down` und
  demselben Test bleibt er aus.
- `docker compose --env-file .env.local ps` zeigt `127.0.0.1:3307->3306/tcp`.
- `npx netlify dev`: Das Log enthält `Injected .env.local file env vars: DB_HOST, …`. Bei `DB_HOST`
  steht nicht „defined in .env file“. `GET /api/db-ping` mit Session antwortet `200`.
- `npm run db:migrate` meldet `127.0.0.1:3307/time_manager`, `db:migrate:test` meldet
  `127.0.0.1:3307/time_manager_test`.
- `npm run db:migrate:prod` meldet den Host der Produktion. Nur vom Entwickler ausgeführt, die
  Migrationen 0010 und 0011 stehen dort ohnehin noch aus.
- `npx netlify dev` ohne `.env.local` (kurz umbenannt): Die Functions melden den nicht lokalen
  `DB_HOST` und greifen nicht auf die Produktion zu.
- Mit `DB_HOST=example.com npm run db:seed` bricht das Skript ab und schreibt nichts.
- Ein Eintrag in der UI, dann `db:down` und `db:up`: Der Eintrag ist noch da. Nach `db:reset` ist er weg.
- `npm run dev:test` und `BASE_URL=http://localhost:8889 scripts/api-walkthrough.sh -a`: alle Schritte
  bestehen, in `time_manager` hat sich nichts geändert.
- IntelliJ verbindet sich mit beiden Datenbanken.

## Nicht Teil dieser Version

- Testdaten außer dem Administrator (Projekte, Buchungen); die legt der Walkthrough selbst an
- Unit- oder Integrationstests mit Datenbank in vitest
- Eine Kopie der Produktionsdaten in die lokale Datenbank
- Die Produktion auf `utf8mb4` umstellen; das wäre eine eigene Migration
- CI mit Datenbank
