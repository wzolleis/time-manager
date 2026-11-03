---
name: ui-styling
description: Regeln für Styling mit Tailwind. Seiten (*-page.tsx) enthalten keine CSS-Klassen außer Layout, wiederkehrende Klassen werden zu Komponenten in src/components/. Verwenden beim Schreiben oder Ändern von JSX unter src/features/, bevor ein className gesetzt wird, beim Anlegen einer neuen Komponente und vor jedem Commit mit Änderungen an .tsx-Dateien.
---

# Styling mit Tailwind

Formatierungen stecken in UI-Komponenten, nicht in den Seiten. Eine Seite setzt sich aus Komponenten zusammen, damit
gleiche Darstellungen gleich aussehen und wiederverwendet werden.

Der Skill regelt, *wo* CSS-Klassen stehen dürfen und *wann* eine Komponente entsteht. *Wohin* eine neue Komponente
gehört (`src/components/<art>/` oder `src/features/<feature>/components/`), entscheidet der Skill `ui-modules`.
`src/components/ui/` enthält die shadcn-Elemente und wird nie von Hand geändert.

# Regeln

1. **Seiten enthalten nur Layout-Klassen.** In den Einstiegskomponenten `src/features/<feature>/components/*-page.tsx`
   sind nur Klassen erlaubt, die Elemente anordnen: Abstände (`space-y-4`, `gap-2`, `mt-4`), Flex und Grid
   (`flex`, `grid`, `grid-cols-2`, `items-center`), Breite (`w-full`). Farben, Schrift, Rahmen, Hintergrund und
   Ähnliches gehören in eine Komponente.
2. **Mehr als 2 Klassen an einem Element in einer Seite: nachfragen.** Braucht ein Element in einer `*-page.tsx` mehr
   als 2 CSS-Klassen, wird der User gefragt, mit Begründung, warum dafür keine Komponente entsteht.
3. **Feature-Komponenten dürfen stylen.** Die übrigen Komponenten in `src/features/<feature>/components/` dürfen
   CSS-Klassen verwenden. Auch dort gilt Regel 4.
4. **Wiederholung wird eine Komponente.** Steht die gleiche Kombination von CSS-Klassen an mehr als 2 Stellen
   (auch reine Layout-Klassen, über Dateien und Features hinweg), wird daraus eine UI-Komponente.
5. **Erst wiederverwenden, dann neu anlegen.** Bevor eine Komponente entsteht, in dieser Reihenfolge:
   1. In `src/components/` nach einer passenden Komponente suchen und sie verwenden.
   2. Eine ähnliche Komponente generalisieren, z. B. das Label oder das Icon als Parameter statt fest kodiert.
   3. Erst dann eine neue Komponente anlegen, am Ort nach `ui-modules`.
6. **Bestehenden Code mitziehen.** Entsteht oder ändert sich eine Komponente und gibt es im bestehenden Code Stellen,
   die gleich oder sehr ähnlich formatiert sind, dürfen sie in derselben Änderung auf die Komponente umgestellt
   werden. Bestehende Klassen, die nichts mit der aktuellen Änderung zu tun haben, bleiben, wie sie sind.
7. **Komponenten mit vielen Klassen überarbeiten.** Enthält eine Komponente viele CSS-Klassen (mehrere Elemente mit
   mehr als 2 Klassen), darf sie nach diesen Regeln überarbeitet werden, egal ob sie in `src/features/`,
   `src/components/` oder `src/application/` liegt: Teile durch vorhandene Komponenten ersetzen (Regel 5) und
   Wiederholungen herauslösen (Regel 4). Das gilt, wenn die Komponente ohnehin geändert wird oder wenn der User
   eine Untersuchung des Codes nach diesem Skill verlangt.

# Eigene Komponenten bauen

Die Komponenten in `src/components/<art>/` sind eine zweite Schicht über shadcn. shadcn liefert offene Bausteine
(`Dialog`, `DialogTrigger`, `DialogContent` …). Unsere Komponenten sind fertige Vorlagen, die Aussehen und Ablauf
festlegen, damit Seiten gleich aussehen. Deshalb gelten diese Konventionen:

1. **Vorlagen mit Properties.** Eine Komponente bekommt ihre Inhalte als Properties (`title`, `description`,
   `label`, `icon` …), nicht als Teilkomponenten. Teilkomponenten wie bei shadcn nur, wenn eine Vorlage sonst zu
   viele Sonder-Properties bräuchte.
2. **Native Props durchreichen, `className` nicht.** Was das zugrunde liegende Element kennt (`id`, `aria-*`,
   `data-*`, `disabled`, `onClick`, `ref` …), wird durchgereicht. `className` nur bei Layout-Komponenten wie `Page`,
   `Muted` oder `ErrorText`, sonst kämen über die Hintertür wieder Klassen in die Seiten.
3. **Dialoge verwalten selbst, ob sie offen sind.** Wie bei shadcn ist `open` optional. Zurücksetzen beim Öffnen
   über `onOpen`, Schließen nach dem Speichern über `close`, das `onSubmit` bekommt:
   `mutate(data, {onSuccess: close})`. `open` und `onOpenChange` nur, wenn etwas anderes als der Trigger den
   Dialog öffnet (z. B. ein Menüeintrag, `password-change-dialog.tsx`) oder der Aufrufer `open` braucht (z. B. um
   Daten erst beim Öffnen zu laden, `user-roles-dialog.tsx`).
4. **Trigger als Property `trigger`.** Ein Dialog bekommt den Button, der ihn öffnet, als `trigger={<Button …/>}`.
   `children` ist immer der Inhalt, nie der Trigger.
5. **Varianten ohne Klassen-Properties.** Keine Properties wie `valueClassName`. Eine Variante ist eine fachliche
   Property (`variant`, `columns` …), die Komponente wählt die Klassen dazu.

# Beispiele aus dem Projekt

- `src/components/buttons/`: `edit-button.tsx` und `delete-button.tsx` sind Spezialisierungen von
  `action-button.tsx`, die Generalisierung mit Label und Icon als Parameter.
- Bausteine, die vor einer neuen Komponente geprüft werden:
  - Seite: `src/components/page/page.tsx`, `src/components/page/page-header.tsx`
  - Formulare: `src/components/form/form-row.tsx`, `src/components/form/form-field.tsx`,
    `src/components/form/form-dialog.tsx`, `src/components/form/edit-dialog.tsx`
  - Links: `src/components/text/text-link.tsx` (`TextLink`, `ExternalLink`)
- `src/features/passkeys/components/passkey-add-dialog.tsx`: `FormDialog` ohne `open`, mit `onOpen` und `close`
  - Text: `src/components/text/muted.tsx`, `src/components/text/error-text.tsx`, `src/components/text/loading.tsx`
  - Kennzahlen: `src/components/cards/metric-card.tsx`, `src/components/cards/metric-grid.tsx`
  - Tabellen: `src/components/table/data-table.tsx`

# Prüfung vor dem Commit

Geprüft werden nur die neuen und geänderten Zeilen im Diff, nicht der Bestand.

- Enthält eine `*-page.tsx` Klassen, die nicht Layout sind, oder ein Element mit mehr als 2 Klassen?
- Taucht eine Klassen-Kombination jetzt an mehr als 2 Stellen auf?

Bei einem Treffer wird nicht committet. Dem User jede Stelle melden (Datei, Klassen, Begründung, warum keine
Komponente entstanden ist, oder Vorschlag für eine Komponente) und nachfragen. Nur wenn der User ausdrücklich
bestätigt, darf committet werden.
