---
name: database-backup
description: Der Administrator sichert die Datenbank der Produktion. Das Programm erstellt jede Nacht oder auf Knopfdruck einen verschlüsselten SQL-Dump auf dem Backup-Speicher. In der UI sieht er das Ergebnis und kopiert das neueste Backup auf seinen Rechner.
type: story
epics: betrieb
state: open
---

# Database Backup

„Der Administrator stellt sicher, dass ein aktuelles Backup der Datenbank existiert, und sieht, ob es geklappt hat.“

Bisher gibt es im Projekt kein eigenes Backup. Die Produktion ist eine MariaDB 10.11 bei webhostone (Shared Hosting)
ohne administrativen Zugriff. `mariadb-dump` und `mariabackup` stehen in den Netlify Functions nicht zur Verfügung.
Das Programm erzeugt den Dump deshalb selbst über die normale Datenbankverbindung.

Der Hoster sichert stündlich und bewahrt die Stände 3 Tage auf, die Wiederherstellung ist aber nur auf Anfrage und
kostenpflichtig möglich (https://www.webhostone.de/webhosting). Fehler, die später auffallen, deckt das nicht ab.

## Regeln

1. **Auslöser.** Das Backup läuft jede Nacht automatisch. Ein Administrator kann es zusätzlich von Hand starten, z. B.
   vor einer Migration. Läuft gerade ein Backup, startet kein zweites.
2. **Nur Administratoren.** Alle Funktionen dieser Story darf nur die Rolle Administrator verwenden (`endpoint_roles`).
3. **Konsistenter Stand.** Der Dump entsteht in einer lesenden Transaktion mit
   `START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY`. Ist eine Tabelle nicht InnoDB, wäre der Stand nicht
   konsistent, der Lauf bricht dann mit einer Fehlermeldung ab.
4. **Inhalt.** Alle Tabellen aus `SHOW FULL TABLES`, also auch die Migrationstabelle von Drizzle und künftige Tabellen.
   Struktur aus `SHOW CREATE TABLE`, Daten aus `SELECT *`. Von `sessions`, `passkey_challenges` und `backup_runs` kommt nur die
   Struktur in den Dump, die Daten werden nach einem Einspielen nicht gebraucht. Danach melden sich alle neu an.
5. **Format.** Ein SQL-Dump, den das Skript zum Einspielen liest und der sich auch von Hand einspielen lässt, mit dem Client
   `mariadb` oder in phpMyAdmin. Jede Anweisung steht in einer eigenen Zeile, das Skript führt sie einzeln aus. Der Dump gibt `SET NAMES utf8mb4` vor und schaltet beim Einspielen die Fremdschlüsselprüfung aus. Datumswerte werden
   als Text gelesen (`dateStrings`), damit die Umrechnung über `Date` keine Zeiten verschiebt.
6. **Verschlüsselung.** Der Dump wird mit gzip komprimiert und danach mit dem öffentlichen Schlüssel von `age`
   verschlüsselt, bevor er die Function verlässt. Der private Schlüssel liegt nicht bei Netlify und nicht bei webhostone,
   sondern nur beim Administrator und an einem zweiten sicheren Ort. Denn der Dump enthält Passwort-Hashes und alle
   Zeitdaten, und der Speicher liegt beim selben Hoster wie die Datenbank.
7. **Ablage.** Der Upload per FTPS läuft erst als `<name>.tmp` und wird danach umbenannt, ein abgebrochener Upload sieht
   so nie wie ein fertiges Backup aus. Das Verzeichnis `/timemanager` im Webspace liegt außerhalb jedes
   Web-Verzeichnisses (Docroot), damit die Dateien nicht per HTTP erreichbar sind. Der Name enthält den Zeitpunkt in UTC:
   `time_manager_2026-11-08T020000Z.sql.gz.age`, mit Sekunden, damit zwei Läufe in derselben Minute sich nicht überschreiben.
8. **Zugang.** Ein eigener FTP(S)-Benutzer nur für das Backup, mit einem langen, zufälligen Passwort, das nur als
   Netlify-Secret gespeichert ist. Sein Startverzeichnis im Adminpanel ist `/timemanager`, er sieht also nur die Backups. Die
   Verbindung ist immer TLS (höchstens 1.2, mit 1.3 brachen lokal Datenverbindungen ab), unverschlüsseltes FTP ist ausgeschlossen. Das Zertifikat wird normal geprüft (Kette und
   Hostname), weicht es ab, bricht der Upload ab, damit das Passwort nicht an einen falschen Server geht.
9. **Aufbewahrung.** Die Function löscht alte Stände selbst und behält 7 tägliche, 4 wöchentliche und 12 monatliche.
   Sie löscht nur nach einem erfolgreichen Upload und nur Dateien, deren Name zum Muster passt. Einen reinen Schreibzugriff
   beschreibt die Doku des Hosters nicht. Mit den Netlify-Secrets ließen sich Backups also auch löschen.
10. **Fehler fallen auf.** Jeder Lauf speichert Zeitpunkt, Auslöser, Ergebnis, Dateigröße und die Fehlermeldung (ohne
    Zugangsdaten). Die Administration warnt, wenn der letzte Lauf fehlgeschlagen oder der letzte Erfolg älter als
    26 Stunden ist.
11. **Kopie außerhalb von webhostone.** Datenbank und Backup-Speicher liegen im selben Account. Das Backup schützt so vor
    Fehlern wie einer misslungenen Migration, aber nicht vor einem Ausfall oder Kontoverlust bei webhostone. Deshalb gibt
    es den Button „Auf diesen Rechner kopieren“: Er lädt das neueste Backup verschlüsselt über den Browser herunter. Es
    läuft nichts automatisch.
12. **Datum der letzten Kopie.** Nach dem vollständigen Download speichert das Programm Datum und Datei in der Datenbank.
    Ist die letzte Kopie länger als 7 Tage her oder gab es noch keine, zeigt die UI einen Hinweis. Das Datum belegt nur den
    Download im Browser, nicht, dass die Datei noch auf dem Rechner liegt.
13. **Kein Restore in der UI.** Es gibt keinen Button zum Einspielen. Eingespielt wird mit einem Skript auf dem Rechner des
    Administrators, siehe „Restore per Skript“, oder nach der Anleitung, siehe „Restore von Hand“. Beide brauchen die kopierte
    Datei und den privaten Schlüssel, die nicht im Programm liegen.

## Beispiele

| Situation                                       | Ergebnis                                                        |
|-------------------------------------------------|-----------------------------------------------------------------|
| Nächtlicher Lauf klappt                         | Neue Datei auf dem Backup-Speicher, alte Stände sind rotiert    |
| FTPS-Server nicht erreichbar                    | Lauf fehlgeschlagen, Warnung, vorhandene Backups bleiben stehen |
| Upload bricht ab                                | Nur eine `.tmp`-Datei, sie zählt nicht als Backup               |
| Zertifikat ungültig oder Hostname falsch        | Kein Upload, Lauf fehlgeschlagen                                |
| Zwei Administratoren starten gleichzeitig       | Der zweite bekommt die Meldung, dass ein Backup läuft           |
| Nächtlicher Lauf wurde nicht ausgelöst          | Nach 26 Stunden ohne Erfolg erscheint die Warnung               |
| Administrator ohne privaten `age`-Schlüssel     | Kein Restore möglich, deshalb liegt er an zwei Orten            |
| Letzte Kopie vor 8 Tagen                        | Hinweis in der UI, nichts läuft automatisch                     |
| Noch nie kopiert                                | Hinweis in der UI                                               |
| Download bricht ab                              | Datum der letzten Kopie bleibt unverändert                      |
| Skript ohne Produktions-Befehl                  | Spielt nur in die lokale Datenbank `time_manager_restore` ein   |
| Falscher Schlüssel oder beschädigte Datei       | Abbruch vor der ersten Änderung                                 |
| Produktion, Name der Datenbank falsch eingetippt | Abbruch, Datenbank unverändert                                 |
| Produktion, Sicherung davor schlägt fehl        | Abbruch, Datenbank unverändert                                  |
| Abbruch mitten im Einspielen                    | Meldung, Skript erneut ausführen                                |

## Restore per Skript

```sh
npm run backup:restore -- <datei> <schlüsseldatei>        # lokal, nach time_manager_restore
npm run backup:restore:prod -- <datei> <schlüsseldatei>   # Produktion, nur im Notfall
```

1. **Lokal als Standard.** Ohne Produktions-Befehl schreibt das Skript nur in die lokale Datenbank
   `time_manager_restore`, legt sie bei Bedarf an und bricht ab, wenn `DB_HOST` nicht lokal ist. So lässt sich ein Backup
   der Produktion prüfen, ohne die Produktion zu berühren.
2. **Produktion.** `backup:restore:prod` verwendet wie `db:migrate:prod` die Zugangsdaten aus `.env.production`
   (`APP_ENV=production`). Das Skript zeigt Ziel und Datei und verlangt, dass der Name der Datenbank eingetippt wird. Davor
   schreibt es den aktuellen Stand verschlüsselt in eine lokale Datei, schlägt das fehl, bricht es ab.
3. **Entschlüsseln.** Das Skript entschlüsselt und entpackt im Speicher, es braucht kein `age` und kein `mariadb` auf dem
   Rechner, und es bleibt keine unverschlüsselte Datei liegen. Der Schlüssel wird weder ausgegeben noch gespeichert.
4. **Ergebnis.** Zum Schluss gibt das Skript je Tabelle die Zeilenzahl aus und vergleicht sie mit dem Dump.
5. **Grenzen.** `DROP` und `CREATE` lassen sich in MariaDB nicht zurückrollen. Bricht das Skript in der Mitte ab, ist die
   Datenbank unvollständig, dann wird es erneut ausgeführt. Was in der Produktion nach dem Backup geschrieben wurde, geht
   verloren, und alle User melden sich neu an. Die Historie in `backup_runs` ist danach leer. Ist das Backup älter als die
   letzte Migration, weist das Skript auf `npm run db:migrate:prod` hin.

## Restore von Hand

Für den Fall, dass das Skript nicht läuft, z. B. auf einem anderen Rechner ohne das Projekt. Die Anleitung steht auch in der
README, damit sie im Notfall ohne die Story zu finden ist.

1. Neueste Datei vom Backup-Speicher oder aus der lokalen Kopie nehmen.
2. Entschlüsseln und entpacken, dafür muss `age` installiert sein: `age -d -i <schlüsseldatei> <datei> | gunzip > dump.sql`
3. Vor dem Einspielen in die Produktion den aktuellen Stand sichern, per phpMyAdmin oder mit „Backup jetzt erstellen“.
4. Einspielen, mit `mariadb -h <host> -P <port> -u <user> -p <datenbank> < dump.sql` oder in phpMyAdmin unter „Importieren“.
   Der Dump löscht und erstellt die Tabellen neu.
5. Wurde seit dem Backup migriert: `npm run db:migrate:prod`.
6. Prüfen: Zeilenzahlen, Umlaute, Anmeldung.
7. `dump.sql` löschen, die Datei ist unverschlüsselt.

## Umsetzung nach der Architektur

- **Tabelle:** `backup_runs` in `db/schema.ts`. Das Datum der letzten Kopie steht als eigene Spalte am kopierten Lauf. Dazu eine Migration mit `npm run db:generate`, in
  derselben Migration die Einträge in `endpoint_roles` für `/api/backups`.
- **Dump und Upload:** `netlify/functions/lib/backup-file.ts` (Dump, Komprimierung, Verschlüsselung, Lesen beim Restore),
  `netlify/functions/lib/backup-ftp.ts` (Upload, Download, Rotation), `netlify/functions/lib/backup-store.ts`
  (Läufe).
- **Endpoint:** `netlify/functions/backups.ts`: `GET /api/backups` (Läufe, Warnungen), `POST /api/backups` (Start von Hand),
  `GET /api/backups/:id/file` (Download), `POST /api/backups/:id/copied` (Datum der Kopie).
- **Zeitplan:** `netlify/functions/backup-scheduled.ts` mit `schedule` in `config`, einmal pro Nacht. Beide Functions
  verwenden `lib/backup-store.ts`, eine Function importiert keine andere.
- **Rotation:** Die Auswahl der zu löschenden Dateien ist eine reine Funktion, `netlify/functions/lib/backup-rotation.ts`.
- **UI:** Seite `/admin/backups` mit Karte auf dem Administrator Dashboard (`menu: "admin-dashboard"`), Liste der Läufe,
  Warnungen, Buttons „Backup jetzt erstellen“ und „Auf diesen Rechner kopieren“. View und Repository nach Skill `architecture`, Dateien nach `ui-modules`.
- **Skript:** `scripts/backup-restore.ts` mit `npm run backup:restore` und `backup:restore:prod`, Auswahl des Ziels über
  `scripts/lib/env.ts`. Das Lesen der Datei wird getrennt gehalten, damit der Test es verwenden kann.
- **Lokal:** Ein FTPS-Container in `compose.yaml` (`npm run ftps:up`), nie der echte Speicher. `npm run dev:backup`
  startet `netlify dev` mit `NODE_EXTRA_CA_CERTS`, damit das selbst signierte Zertifikat normal geprüft wird. Die Regel aus
  `../boundaries/local-environment.md` gilt weiter.
- **Dependencies:** `basic-ftp` und `age-encryption`, nur im Backend.
- **Umgebung (Netlify-Secrets):** `BACKUP_FTP_HOST`, `BACKUP_FTP_PORT`, `BACKUP_FTP_USER`, `BACKUP_FTP_PASSWORD`,
  `BACKUP_AGE_RECIPIENT`.

### Stand der Prüfung

Lokal geprüft am 2026-11-07, gegen den FTPS-Container und die lokale Datenbank:

- **Ablauf:** Backup von Hand in etwa 3 Sekunden, Upload als `.tmp` und Umbenennen, Rotation, Download über den
  Browser mit gleicher Größe, Datum der Kopie gespeichert. Zwei gleichzeitige Starts: einer läuft, der andere bekommt 409.
- **Fehler:** Ohne gültiges Zertifikat schlägt der Lauf fehl und steht mit Meldung in der Liste.
- **Rundreise:** Mit `npm run backup:restore` nach `time_manager_restore` eingespielt, alle Tabellen mit gleicher
  `CHECKSUM TABLE` wie das Original, auch Umlaute, `ß`, `€`, `'` und `\`. Falscher Schlüssel, abgeschnittene Datei und
  nicht lokale Datenbank brechen vor der ersten Änderung ab.
- **Restore von Hand:** Entschlüsselter Dump mit dem Client `mariadb` eingespielt, gleiche Zeilenzahlen und Checksummen.
  Die Kommandozeile von `age` und phpMyAdmin sind dabei nicht getestet.
- **Rechte:** `scripts/api-walkthrough.sh` prüft, dass ein User ohne Administrator-Rolle alle vier Endpoints mit 403
  abgewiesen bekommt.

Noch offen, erst mit der Produktion zu prüfen:

- **webhostone:** Anmeldung per FTPS aus einer Netlify Function (keine festen IP-Adressen, passive Datenports), Upload,
  Umbenennen und Löschen im Startverzeichnis `/timemanager`.
- **Netlify:** Eine Scheduled Function hat 30 Sekunden, der Download als Stream bis 20 MB. Reicht das nicht, startet die
  Scheduled Function eine Background Function, und der Download braucht Teile.
- **Datenbank:** Alle Tabellen InnoDB, `SHOW CREATE TABLE` erlaubt und eine zweite Verbindung neben dem Pool.

## Tests

- `netlify/functions/lib/backup-rotation.test.ts`: Welche Stände bleiben (7/4/12), fremde Dateien und `.tmp` werden nicht
  angefasst.
- `netlify/functions/lib/backup-file.test.ts`: Datumswerte, `NULL`, Umlaute, `ß`, `€`, Anführungszeichen und Binärdaten werden
  richtig in SQL geschrieben; `sessions` ohne Daten.
- **Rundreise gegen die lokale Datenbank:** Dump aus der lokalen Datenbank erstellen, mit `npm run backup:restore` in
  `time_manager_restore` einspielen und jede Tabelle mit dem Original vergleichen.
- **Schutz des Skripts:** Falscher Schlüssel und beschädigte Datei ändern nichts, ohne Produktions-Befehl wird eine
  nicht lokale Datenbank abgelehnt.
- **Fehlerfälle gegen den FTPS-Container:** ungültiges Zertifikat, Server ohne TLS, abgebrochener Upload, kein Zugriff.
- **Hinweis zur Kopie:** Grenze bei 7 Tagen, noch nie kopiert, abgebrochener Download.
- **Anleitung „Restore von Hand“:** Einmal lokal Schritt für Schritt durchspielen, auch der Import in phpMyAdmin
  mit einem Dump aus der lokalen Datenbank, falls dort verfügbar.
- **Abschlusstest der Story:** Backup in der Produktion auslösen, mit dem Button kopieren, mit `npm run backup:restore`
  lokal nach `time_manager_restore` einspielen und das Ergebnis prüfen: Zeilenzahlen, Umlaute, Zeiten. Erst dann ist die
  Story fertig. Die Produktion wird dabei nur gelesen.
