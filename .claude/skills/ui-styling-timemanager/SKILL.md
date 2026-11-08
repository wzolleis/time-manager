---
name: ui-styling-timemanager
description: Die vorhandenen UI-Bausteine des time-managers unter src/components/, die vor einer neuen Komponente geprüft werden, und Beispiele für Dialoge. Ergänzt den Skill ui-styling. Verwenden beim Schreiben oder Ändern von JSX im time-manager, beim Anlegen einer Komponente und vor jedem Commit mit .tsx-Dateien.
---

# Styling im time-manager

Lade zuerst den Skill `ui-styling`. Hier steht nur, was im time-manager zusätzlich gilt.

## Bausteine, die vor einer neuen Komponente geprüft werden

- Buttons: `src/components/buttons/action-button.tsx`, Spezialisierungen `edit-button.tsx` und `delete-button.tsx`
- Seite: `src/components/page/page.tsx`, `src/components/page/page-header.tsx`
- Formulare: `src/components/form/form-row.tsx`, `src/components/form/form-field.tsx`,
  `src/components/form/form-dialog.tsx`, `src/components/form/edit-dialog.tsx`
- Links: `src/components/text/text-link.tsx` (`TextLink`, `ExternalLink`)
- Text: `src/components/text/muted.tsx`, `src/components/text/error-text.tsx`, `src/components/text/loading.tsx`
- Kennzahlen: `src/components/cards/metric-card.tsx`, `src/components/cards/metric-grid.tsx`
- Tabellen: `src/components/table/data-table.tsx`

`className` durchreichen dürfen `Page`, `Muted` und `ErrorText`.

## Dialoge

- `src/features/passkeys/components/passkey-add-dialog.tsx`: `FormDialog` ohne `open`, mit `onOpen` und `close`
- `password-change-dialog.tsx`: mit `open`, weil ein Menüeintrag den Dialog öffnet
- `user-roles-dialog.tsx`: mit `open`, weil die Rollen erst beim Öffnen geladen werden
