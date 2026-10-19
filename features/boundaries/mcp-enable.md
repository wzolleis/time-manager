---
name: mcp-enable
description: Beschreibt den MCP-Server, mit dem ein Agent (z. B. Claude Code) die Anwendung bedient. Der Agent verbindet sich mit einem API-Token (mcp-token.md) mit /api/mcp und stempelt, trägt Buchungen nach, ändert und löscht sie und fragt Tages-, Wochen- und Monatsbericht ab. Enthält Tools, Formate der Ergebnisse, Regeln und die Schritte der Umsetzung.
---

# MCP-Server

„Der User bedient die Zeiterfassung mit einem Agent.“

Der User sagt seinem Agent z. B. „stempel mich ein für Projekt Alpha“ oder „wie viele Überstunden habe ich
diesen Monat?“. Der Agent ruft dafür Tools des MCP-Servers der Anwendung auf. Die Tools bieten dieselben
Use Cases wie die UI und halten dieselben Regeln ein. Es gibt keine eigene Fachlogik für den Agent.

Der Use Case ist umgesetzt. Diese Beschreibung hält fest, wie sich der Server verhält. Code:

- Function `../../netlify/functions/mcp.ts`
- Tools `../../netlify/functions/lib/mcp-tools/` (`time-entries.ts`, `reports.ts`), Berichte und Formate
  ohne DB in `report-view.ts` und `view.ts`
- Regeln der Buchungen `../../netlify/functions/lib/time-entries-store.ts`, Texte `../../shared/format.ts`

Fachliche Grundlage, vor der Umsetzung lesen:

- Zeiterfassung `../use-case/time-stamp.md`
- Tagesbericht `../use-case/today-report.md`, Monatsbericht `../use-case/monthly-report.md`; der
  Wochenbericht hat keine Beschreibung, maßgeblich ist `useShowWeeklyReport` und `weekTotals`
- Krankmeldung `../use-case/sick-leave.md`, Regel 7 (Buchungen an Krankheitstagen zählen nicht)

Voraussetzung: die Agent-Tokens aus `mcp-token.md`, insbesondere `withToken`. Sie werden zuerst
umgesetzt.

Technische Grundlage: Skill `authorization` (`../../agents/.agents/skills/`), Function
`../../netlify/functions/time-entries.ts`, Services in `../../shared/`.

## Entscheidungen

| Frage                         | Entscheidung                                                                      |
|-------------------------------|-----------------------------------------------------------------------------------|
| Wo läuft der Server?          | Als Netlify Function unter `/api/mcp`, Transport Streamable HTTP, zustandslos     |
| Wie meldet sich der Agent an? | Persönliches API-Token als `Authorization: Bearer …` (`mcp-token.md`), kein Session-Cookie, kein OAuth |
| Welche Use Cases?             | Zeiterfassung und Berichte (siehe Tools), sonst nichts                            |
| Wessen Daten?                 | Immer nur die des Users, dem das Token gehört, auch bei Administratoren          |

Folge der Entscheidungen: Jeder Client, bei dem man einen festen `Authorization`-Header eintragen kann,
funktioniert (Claude Code, Claude API, Cursor, MCP Inspector). In claude.ai und Claude Desktop geht das
nur eingeschränkt, siehe „Einbinden in Claude“.

## Begriffe

| Begriff    | Bedeutung                                                                          | Im Code            |
|------------|------------------------------------------------------------------------------------|--------------------|
| Agent      | Ein KI-Assistent, der im Auftrag des Users Tools aufruft                           |                    |
| MCP        | Model Context Protocol, Standard für Tools, die ein Agent aufrufen kann            | `@modelcontextprotocol/sdk` |
| Tool       | Eine Aktion des MCP-Servers mit Name, Beschreibung und Eingabeschema               |                    |
| API-Token  | Geheimer Schlüssel, mit dem sich der Agent als User ausweist, siehe `mcp-token.md` | `ApiToken`, Tabelle `api_tokens` |

## Ablauf aus Sicht des Users

1. Der User erzeugt auf der Seite „Agent-Zugang“ ein Token und richtet damit seinen Agent ein
   (`mcp-token.md`).
2. Der Agent ruft die Tools auf. Jeder Aufruf läuft als der User des Tokens.

## Tools

Namen auf Englisch in `snake_case`, Beschreibungen auf Deutsch. Jedes Tool hat ein zod-Eingabeschema.
Die Beschreibung sagt dem Agent, wann er das Tool nimmt und welche Regel greifen kann, z. B. bei
`stamp`: „Vorher `get_stamp_status` aufrufen, wenn unklar ist, ob Kommen oder Gehen dran ist.“

| Tool                 | Eingabe                                          | Ergebnis                                                         | Entspricht           | Hinweis (Annotation) |
|----------------------|--------------------------------------------------|------------------------------------------------------------------|----------------------|----------------------|
| `get_stamp_status`   | –                                                | eingestempelt ja/nein, seit wann, Projekt, fehlendes Gehen       | `useStampTime`       | readOnly             |
| `stamp`              | `type`, `projectId?`                             | die angelegte Buchung                                            | `useStampTime`       |                      |
| `list_projects`      | –                                                | Projekte mit `id` und `name`                                     | `useProjects`        | readOnly             |
| `list_time_entries`  | `from`, `to` (Tage)                              | Buchungen im Zeitraum mit Projektname                            | `useTimeEntries`     | readOnly             |
| `add_time_entry`     | `type`, `day`, `time`, `projectId?`              | die angelegte Buchung                                            | `useAddTimeEntry`    |                      |
| `change_time_entry`  | `id`, `time?`, `projectId?`                      | die geänderte Buchung                                            | `useChangeTimeEntry` |                      |
| `delete_time_entry`  | `id`                                             | die ID der gelöschten Buchung                                    | `useDeleteTimeEntry` | destructive          |
| `get_daily_report`   | `day?` (Standard heute)                          | Buchungen, Arbeitszeit, Pausen, Soll, Differenz, Art des Tags    | `useShowDailyReport` | readOnly             |
| `get_weekly_report`  | `day?` (Standard heute, Woche dieses Tags)       | KW, Zeilen pro Tag, Summen, Soll bis heute und Woche             | `useShowWeeklyReport`| readOnly             |
| `get_monthly_report` | `month?` (`JJJJ-MM`, Standard aktueller Monat)   | Zeilen pro Kalenderwoche, Summen                                 | `useShowMonthlyReport`| readOnly            |

Bewusst anders als in der UI:

- **`stamp` verlangt den Typ.** Die UI leitet ihn aus der letzten Buchung ab. Ein Agent wiederholt
  Aufrufe aber manchmal, dann würde ein doppeltes `stamp` aus Kommen ein Gehen machen. Mit Typ scheitert
  die Wiederholung an Regel 2 der Zeiterfassung.
  Der Fehler ist an dieser Stelle gewollt: Der Agent meldet ihn und fragt den User.
- **`delete_time_entry` löscht nur eine einzelne Buchung**, wie „Nur diese“ im Dialog. „Mit Gegenstück“
  gibt es für den Agent nicht, damit er nie mehr löscht als die eine Buchung, die er nennt. Würde die
  Abfolge danach nicht mehr stimmen, scheitert der Aufruf. Ein Paar löscht der Agent in zwei Aufrufen,
  erst das Gehen, dann das Kommen; das sagt auch die Beschreibung des Tools.

### Formate

Eingaben:

- Tage als `JJJJ-MM-TT`, Uhrzeiten als `HH:mm`, beides lokal in `Europe/Berlin` wie in der UI
  (`localDay`, `localTimeToUtc`). Kein UTC in den Eingaben, damit der Agent nicht umrechnen muss.

Ergebnisse: Der Server liefert nur Daten, wie sie dem User erscheinen, entscheidet der Agent. Damit die
Darstellung trotzdem einheitlich ist und der Agent nicht selbst rechnet, hat jedes Ergebnis zwei Teile:

1. **`structuredContent`** mit den genauen Werten, beschrieben durch ein `outputSchema` am Tool. Damit
   rechnet der Agent bei Folgefragen weiter („wie viel fehlt mir bis Freitag?“).
   - Dauern in Minuten als Zahl (`workMinutes`), nicht in Millisekunden.
   - Zeitpunkte als ISO-8601 mit Offset, z. B. `2026-10-19T08:00:00+02:00`.
   - Zu jedem Wert zusätzlich der Text, wie ihn die UI zeigt (`work: "8 Std 15 Min"`).
2. **`content`** mit einem Text in Markdown: bei Berichten eine kurze Überschrift, eine Tabelle und eine
   Zeile mit den Summen. Alle Werte im Format der UI (`formatDuration`, `formatDifference`,
   `formatDayShort`, `formatTime`), Hinweise wie „läuft“, „Feiertag“, „krank“, „Urlaub“ als Text.
   Agents ohne `structuredContent` zeigen damit trotzdem einen brauchbaren Bericht, und das Modell
   übernimmt die Tabelle meist so.

Die Beschreibung der Berichts-Tools empfiehlt dem Agent, die Tabelle aus `content` zu zeigen. Eine
Garantie ist das nicht, auf eine kurze Frage antwortet der Agent auch mit einem Satz.

Beispiel `get_weekly_report` am Mittwoch, 21.10.2026, um 12:10 Uhr, `content`:

```markdown
## KW 43, 19.10.–25.10.2026

| Tag       | Arbeit             | Pause  | Soll  | Differenz   |
|-----------|--------------------|--------|-------|-------------|
| Mo., 19.10. | 8 Std 15 Min       | 45 Min | 8 Std | +15 Min     |
| Di., 20.10. | 7 Std 30 Min       | 30 Min | 8 Std | −30 Min     |
| Mi., 21.10. | 4 Std 10 Min, läuft | 0 Min | 8 Std | −3 Std 50 Min |
| Do., 22.10. | –                  | –      | 8 Std | –           |
| Fr., 23.10. | –                  | –      | 8 Std | –           |
| Sa., 24.10. | –                  | –      | –     | –           |
| So., 25.10. | –                  | –      | –     | –           |

Bis heute 19 Std 55 Min von 24 Std Soll, −4 Std 5 Min. Soll der Woche 40 Std.
```

Dazu `structuredContent` (gekürzt):

```json
{
  "year": 2026,
  "week": 43,
  "days": [
    {"day": "2026-10-19", "kind": "workday", "workMinutes": 495, "work": "8 Std 15 Min",
     "breakMinutes": 45, "targetMinutes": 480, "diffMinutes": 15, "diff": "+15 Min", "running": false}
  ],
  "workMinutes": 1195, "targetToDateMinutes": 1440, "targetWeekMinutes": 2400,
  "diffMinutes": -245, "diff": "−4 Std 5 Min"
}
```

Die Felder folgen `WeekTotals` aus `shared/time-report.ts`, umgerechnet von `…Ms` in `…Minutes`.
Tages- und Monatsbericht sind genauso aufgebaut (Tagesbericht: Tabelle der Buchungen, darunter Arbeit,
Pause, Soll, Differenz; Monatsbericht: eine Zeile pro Kalenderwoche wie in der UI).

## Regeln

1. **Dieselben Regeln wie die REST-API.** Schreibende Tools prüfen `checkSequence` und `checkProject` in
   derselben Transaktion mit `FOR UPDATE` wie `time-entries.ts`. Dazu wird die Logik aus den Handlern
   von `time-entries.ts` in Funktionen ausgelagert (siehe Umsetzung), die REST und MCP gemeinsam nutzen.
   Eine zweite Kopie der Logik im MCP-Code gibt es nicht.
2. **Berichte rechnen mit denselben Services wie die UI:** `dayTotals`, `dayDiffMs`, `weekTotals`,
   `monthTotals`, `targetMs`, `dayKind`, `firstBookingDay`. Die Daten (Buchungen, Urlaube, Feiertage,
   Krankmeldungen, Projekte) liest die Function aus der DB, wie die Endpoints sie liefern. Ein Bericht über
   MCP zeigt dieselben Zahlen wie die UI zum selben Zeitpunkt.
3. **Nur eigene Daten.** Kein Tool hat eine `userId` als Eingabe. Der User kommt immer aus dem Token. Eine
   `id` einer fremden Buchung (`change_time_entry`, `delete_time_entry`) wird wie eine unbekannte behandelt.
4. **Verstöße sind Tool-Fehler, keine Protokollfehler.** Ein `RuleError` (z. B. „Um 09:00 fehlt vorher ein
   "gehen"“) kommt als Ergebnis mit `isError: true` und der Meldung als Text zurück, damit der Agent sie
   dem User zeigen oder seinen Aufruf korrigieren kann. Ungültige Eingaben (zod) ebenso, mit dem Feld.
5. **Krankheitstage** wie in der UI: Buchen ist erlaubt, das Ergebnis enthält den Hinweis aus
   `sickDayMessage`.
6. **Kein Zugriff ohne Token.** Die Function wird mit `withToken` exportiert, ohne gültiges Token gibt es
   `401` (`mcp-token.md`, Regel 6).

## Umsetzung

Reihenfolge, jeder Schritt ist ein eigener Commit mit Tests. Vorher ist `mcp-token.md` umgesetzt.

1. **Logik von `time-entries.ts` auslagern** nach `netlify/functions/lib/time-entries-store.ts`
   (`createEntry`, `changeEntry`, `deleteEntry`, `listEntries`, jeweils mit `userId` und den Regeln aus
   Regel 1). `time-entries.ts` ruft nur noch diese Funktionen auf, das Verhalten der REST-API ändert sich
   nicht. `scripts/api-walkthrough.sh` muss ohne Änderung durchlaufen.
2. **Formatierer nach `shared/format.ts`:** `formatDuration`, `formatDifference`, `formatDayShort` und
   `formatTime` lagen in `src/lib/format.ts` und waren damit nur im Client verfügbar. Sie ziehen um,
   die UI importiert sie von dort, damit Agent und UI dieselben Texte zeigen. Mit ihnen `dayKindLabel`;
   in `src/lib/format.ts` bleibt nur `diffClass` (Tailwind-Klassen).
3. **Function `netlify/functions/mcp.ts`**, `config.path = "/api/mcp"`, exportiert mit `withToken`.
   `McpServer` aus `@modelcontextprotocol/sdk` mit dem Streamable-HTTP-Transport im zustandslosen Modus
   (ohne Session-ID, JSON-Antworten statt SSE), pro Request neu erzeugt. `GET` und `DELETE` auf
   `/api/mcp` antworten mit `405`.
   Achtung beim Transport: Eine Netlify Function bekommt einen Web-`Request` und gibt eine `Response`
   zurück. Der bekannte `StreamableHTTPServerTransport` des SDK erwartet dagegen Node-Objekte
   (`IncomingMessage`/`ServerResponse`, wie bei Express). Vor dem Umsetzen in der installierten
   SDK-Version nachsehen, ob es einen Transport für Web-`Request`/`Response` gibt, und den nehmen. Gibt es
   keinen, einen kleinen Adapter in `lib/` schreiben, der den `Request` in Node-Objekte umsetzt.
   Ergebnis: Das SDK (1.32) hat `WebStandardStreamableHTTPServerTransport`, ein Adapter ist nicht nötig.
   Der Client muss `Accept: application/json, text/event-stream` schicken, sonst antwortet er mit `406`.
4. **Tools** in `netlify/functions/lib/mcp-tools/`, ein File pro Gruppe (`time-entries.ts`,
   `reports.ts`). Die Berichte bauen die Ergebnisse aus den Services in `shared/` (Regel 2).
5. **Doku:** Abschnitt „/api/mcp“ im Skill `authorization`, `README.md` mit dem Befehl zum Verbinden.

## Tests

Nach dem Skill `architecture` (`testing.md`): Functions haben keine Unit-Tests, weil sie die DB brauchen.

- **Unit-Tests in `netlify/functions/lib/`** für alles ohne DB: die Berichte aus gegebenen Daten bauen, die
  Formate (Minuten, Text wie in der UI, ISO mit Offset), die Markdown-Tabelle eines Berichts,
  `RuleError` → Ergebnis mit `isError`.
- **`scripts/api-walkthrough.sh`** gegen `netlify dev` erweitern: Token per `POST /api/api-tokens`
  erzeugen, dann JSON-RPC-Aufrufe an `/api/mcp` (`initialize`, `tools/list`, `tools/call`), mindestens:
  - `stamp` Kommen, dann `stamp` Kommen → `isError` mit der Meldung aus `checkSequence`
  - `add_time_entry` Gehen mit Projekt → `isError` mit der Meldung aus `checkProject`
  - `delete_time_entry` mit der `id` einer Buchung eines anderen Users → nicht gefunden
  - `delete_time_entry` auf das Gehen eines Paares mit folgendem Kommen → `isError`, nichts gelöscht
  - `get_daily_report` liefert dieselben Zahlen wie der Tagesbericht in der UI
- Manuell mit dem MCP Inspector (`npx @modelcontextprotocol/inspector`) gegen `netlify dev`: alle Tools
  erscheinen, Beschreibungen und Schemas sind lesbar.

## Beispiele

| Der User sagt dem Agent                          | Aufrufe des Agents                                                                  |
|--------------------------------------------------|-------------------------------------------------------------------------------------|
| „Stempel mich ein für Alpha.“                    | `list_projects` → `stamp {type: "kommen", projectId: …}`                            |
| „Ich gehe jetzt.“                                | `get_stamp_status` → `stamp {type: "gehen"}`                                        |
| „Gestern habe ich vergessen auszustempeln, war 17:30.“ | `get_stamp_status` (fehlendes Gehen gestern) → `add_time_entry {type: "gehen", day: <gestern>, time: "17:30"}` |
| „Wie viel habe ich diese Woche gearbeitet?“      | `get_weekly_report`                                                                 |
| „Lösch das Kommen um 13:00, das war ein Versehen.“ (Kommen 08:00, Gehen 12:00, Kommen 13:00) | `get_daily_report` → `delete_time_entry {id: <Kommen 13:00>}`, gültig, übrig bleibt 08:00–12:00 |
| „Lösch meine Buchungen von 13 bis 17 Uhr.“ (Kommen 08:00, Gehen 12:00, Kommen 13:00, Gehen 17:00) | `delete_time_entry {id: <Kommen 13:00>}` scheitert, weil dann zwei Gehen aufeinander folgen. Der Agent löscht erst Gehen 17:00, dann Kommen 13:00, beides gültig |

## Einbinden in Claude

Geprüft gegen die Doku von Anthropic im Oktober 2026, vor der Doku in `README.md` am 20.10.2026 noch
einmal. Die Connectors ändern sich häufig.

| Client                       | Mit dem Agent-Token                                                          |
|------------------------------|------------------------------------------------------------------------------|
| Claude Code                  | ✅ direkt mit `claude mcp add`                                               |
| Claude API (MCP-Connector)   | ✅ direkt, Token als `authorization_token`                                   |
| claude.ai und Claude Desktop | ⚠️ nur über „Request headers“: Beta für wenige Accounts, und nur sinnvoll bei Free, Pro und Max |
| claude.ai bei Team/Enterprise | ❌ ein Header gilt für die ganze Organisation, dafür bräuchte es OAuth      |

### Claude Code

Läuft auf dem Rechner des Users und verbindet sich von dort mit `/api/mcp`:

```bash
claude mcp add --transport http time-manager https://<host>/api/mcp \
  --header "Authorization: Bearer tm_…"
```

- `--scope local` (Standard) und `--scope user` speichern in `~/.claude.json`, `--scope project` schreibt
  `.mcp.json` ins Repo. In `.mcp.json` nie das Token selbst, sondern eine Variable:
  `"headers": {"Authorization": "Bearer ${TIME_MANAGER_TOKEN}"}`. Claude Code setzt `${VAR}` und
  `${VAR:-default}` in `url` und `headers` ein.
- `/mcp` in Claude Code zeigt, ob der Server verbunden ist und wie viele Tools er hat.
- Lokal gegen `netlify dev` mit `http://localhost:8888/api/mcp`.

### Claude API

Für eine eigene Anwendung, die Claude im Hintergrund nutzt, z. B. einen Bot. Die Anwendung schickt bei
jedem Aufruf der Messages API die Adresse des MCP-Servers und das Token mit. Die Server von Anthropic
rufen dann `/api/mcp` auf, nicht die Anwendung selbst. Deshalb muss der Server öffentlich erreichbar sein
(Netlify ist das), die Aufrufe kommen aus `160.79.104.0/21`.

```bash
curl https://api.anthropic.com/v1/messages \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: mcp-client-2025-11-20" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 2000,
    "messages": [{"role": "user", "content": "Wie viel habe ich diese Woche gearbeitet?"}],
    "mcp_servers": [{"type": "url", "name": "time-manager",
                     "url": "https://<host>/api/mcp", "authorization_token": "tm_…"}],
    "tools": [{"type": "mcp_toolset", "mcp_server_name": "time-manager"}]
  }'
```

- `authorization_token` schickt Anthropic als `Authorization: Bearer …`, das passt zu `withToken`.
- Die Antwort enthält die Aufrufe als Blöcke `mcp_tool_use` und `mcp_tool_result` und danach den Text von
  Claude. Das Ergebnis eines Tools kommt dort als Text an, deshalb ist der Markdown-Teil in `content`
  wichtig (siehe „Formate“).
- Nur Tools werden unterstützt, keine Resources und Prompts. Das passt zu dieser Version.
- Das Token gehört einem User. Eine Anwendung für mehrere User braucht pro User dessen Token.
- Der Connector ist Beta und nicht für Zero Data Retention zugelassen.
- Neuer ist der Beta-Header `mcp-client-2026-09-15`. Er kann alles, was `mcp-client-2025-11-20` kann, und
  hält zusätzlich die Tool-Liste des Servers im Gespräch fest (Block `mcp_tool_listing`). Beide
  funktionieren mit `/api/mcp`.

### claude.ai und Claude Desktop

Beide nutzen dieselben Connectors („Customize > Connectors > Add custom connector“). Ein fester Header
lässt sich dort nur unter „Request headers“ eintragen, mit „No sign-in“ und dem Wert
`Bearer tm_…`. Das ist Beta und nur für wenige Accounts freigeschaltet.

- **Free, Pro, Max:** Der User fügt den Connector in seinem eigenen Account hinzu. Mit „Request headers“
  wäre das sein persönliches Token, das passt.
- **Team, Enterprise:** Nur ein Owner fügt Connectors für die ganze Organisation hinzu. Ein Header gilt
  dann für alle Mitglieder, alle würden als derselbe User buchen. Das widerspricht „nur eigene Daten“.
  Hier hilft nur OAuth, bei dem sich jedes Mitglied selbst anmeldet.
- Ohne Freischaltung für „Request headers“ geht es in claude.ai und Desktop gar nicht.
- Claude schickt den Wert genau so, wie er eingetragen ist, ohne Schema davor. Der Wert muss also mit
  `Bearer ` beginnen.
- Request headers lassen sich nach dem Anlegen nicht ändern. Für ein neues Token (abgelaufen oder
  widerrufen) den Connector entfernen und neu hinzufügen.
- Im Free-Plan gibt es nur einen Custom Connector.
- Die Aufrufe kommen wie bei der API von den Servern von Anthropic.

## Nicht Teil dieser Version

- Krankmeldungen, Urlaube, Feiertage und Projekte anlegen oder ändern
- Handeln für andere User, auch als Administrator
- OAuth und damit Custom Connectors in claude.ai für Team und Enterprise
- MCP-Resources und -Prompts, nur Tools
- Löschen mit Gegenstück in einem Aufruf, das gibt es nur in der UI
