---
name: version
description: Die Anwendung zeigt ihre Version an, damit man erkennt, ob eine Änderung schon auf Netlify sichtbar ist.
type: story
epics: general
state: resolved
---

# Version

Als Anwender und Entwickler möchte ich die Version sehen, damit man erkennt, ob eine Änderung schon
auf Netlify sichtbar ist.

Umgesetzt wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen.

## Version
Die Version ist das Datum des Commits, aus dem gebaut wurde, im Format `YYYY-MM-DD` in der Zeitzone
Europe/Berlin, z. B. `2026-10-23`. Eine Uhrzeit gehört nicht dazu, eindeutig macht den Stand der Commit-Hash.
Dazu kommt der kurze Commit-Hash (7 Zeichen), z. B. `f6ffaa6`, als Link auf den Commit in GitHub
(`https://github.com/wzolleis/time-manager/commit/<hash>`).

- Commit-Datum statt Build-Datum: Baut Netlify denselben Commit erneut, bleibt die Version gleich.
- Bei nicht committeten Änderungen (lokal) wird `-dirty` an die Version angehängt.
- Die Werte entstehen zur Buildzeit über `define` in `vite.config.ts` (z. B. `__APP_VERSION__`,
  `__APP_COMMIT__`, deklariert in einer neuen Datei `src/vite-env.d.ts`). Auf Netlify kommt der Hash aus `COMMIT_REF`,
  lokal aus `git rev-parse HEAD`, das Datum aus `git log -1 --format=%cI`.
- `npm run dev` zeigt den aktuellen Commit, ggf. mit `-dirty`.

## Anzeige
Oben rechts ist der Avatar des Users. Ein Klick darauf öffnet ein Menü
(`../../src/features/users/components/user-dropdown.tsx`). Dort gibt es einen neuen Eintrag „Version“ mit
dem Icon `Info` (lucide), direkt vor dem Trenner über „Log out“.

Ein Klick auf den Eintrag öffnet einen modalen Dialog:

- Titel: „Version“
- Zeile „Version“: z. B. `2026-10-23`
- Zeile „Commit“: z. B. `f6ffaa6`, als Link auf den Commit in GitHub (öffnet in neuem Tab)
- Button „Schließen“

Der Dialog schließt über das Close-Icon oben rechts, den Button „Schließen“, einen Klick außerhalb des
Dialogs und die Escape-Taste.

Gebaut wird der Dialog wie `PasswordChangeDialog` (`../../src/features/auth/components/password-change-dialog.tsx`)
mit `Dialog` aus `../../src/components/ui/dialog.tsx` (bringt das Close-Icon mit) und wird wie dieser in
`../../src/application/layout/header.tsx` eingebunden.

## Wer sieht die Version
Jeder angemeldete User. Auf der Login-Seite gibt es kein Avatar-Menü und damit keine Version.

## Nicht Teil dieses Use Cases
- keine API, kein Server-Endpoint, kein MCP-Tool
- keine Umgebung (Produktion/local)

## Akzeptanzkriterien
- Das Avatar-Menü enthält den Eintrag „Version“, ein Klick öffnet den Dialog.
- Der Dialog zeigt Version und Commit-Hash, der Hash verlinkt auf den Commit in GitHub.
- Close-Icon, Button „Schließen“, Klick außerhalb und Escape schließen den Dialog.
- Ein Komponententest (jsdom, wie die anderen `*.test.tsx`) prüft Öffnen, Inhalt und Schließen.
- `npm run build`, `npm run lint` und `npm run test:run` laufen fehlerfrei.
