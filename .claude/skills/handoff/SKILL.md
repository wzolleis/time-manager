---
name: handoff
description: Compact the current conversation into a handoff document for another session.
disable-model-invocation: true
---

# Handoff

Write a handoff document summarizing the current conversation so a fresh agent can continue the work.
Save it to the OS Home Directory des Benutzers, verwende die Umgebungsvariable HOME
— **not** the current workspace — and tell the user the absolute path.
Wenn HOME nicht gesetzt ist verwende die Variable TMPDIR, wenn das auch nicht existiert, dann /tmp/
Das Handoff wird in der Sprache "Deutsch" geschrieben.
Der Dateiname ist im Format claude_handoff_YYYYMMDD_hhmm.md

- YYYY ist das Jahr, zb 2026
- MM ist der Monat, zb. 01
- DD ist der Tag, zb 01
- hh ist die Stunde im 24 Stundenformat
- mm ist die Minute

Include:

- **Goal** — what the work is trying to achieve.
- **Constraints & preferences** — decisions and rules established this session.
- **Progress** — Done / In progress / Blocked.
- **Key decisions** — load-bearing choices and *why* (and notable rejected alternatives).
- **Next steps** — concrete, ordered.
- **Active workflow** — the skill file path in use and the open decision or the current skill step, so the next agent
  re-reads the skill before continuing.
- **Suggested skills** — which skills the next agent should invoke (e.g. `effect-ddd`, `review`).

Rules:

- Do **not** duplicate content already captured in other artifacts (specs in `plans/`, `CONTEXT.md`, issues, commits,
  diffs). Reference them by path or URL instead.
- Redact sensitive information — API keys, passwords, PII.
- If the user passed arguments, treat them as a description of what the next session will focus on, and tailor the
  document accordingly.