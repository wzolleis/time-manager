#!/bin/bash
# Legt für jede nicht leere .md-Datei im angegebenen Verzeichnis ein GitHub-Issue an.
# Aufruf innerhalb des Git-Repos: create_issues.sh <verzeichnis>
set -euo pipefail
dir=${1:?Aufruf: $(basename "$0") <verzeichnis>}
[ -d "$dir" ] || { echo "Kein Verzeichnis: $dir" >&2; exit 1; }

root=$(git -C "$dir" rev-parse --show-toplevel)
repo=$(cd "$root" && gh repo view --json nameWithOwner -q .nameWithOwner)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# Titel aller vorhandenen Issues, um Dubletten zu überspringen
gh issue list --repo "$repo" --state all --limit 1000 --json title -q '.[].title' > "$tmp/titles"

for f in "$dir"/*.md; do
  [ -e "$f" ] || continue
  [ -s "$f" ] || { echo "skip (leer): $f"; continue; }
  abs=$(cd "$(dirname "$f")" && pwd)/$(basename "$f")
  rel=${abs#"$root"/}
  name=$(basename "$f" .md)
  state=$(awk -F': *' '/^state:/{print $2; exit}' "$f")
  epics=$(awk -F': *' '/^epics:/{print $2; exit}' "$f" | tr -d ' ')
  # Body: alles nach dem zweiten ---
  awk 'c>=2{print} /^---$/{c++}' "$f" > "$tmp/body.md"
  title=$(grep -m1 '^# ' "$tmp/body.md" | sed 's/^# //' || true)
  [ -n "$title" ] || title=$name
  if grep -Fxq -- "$title" "$tmp/titles"; then
    echo "skip (Issue existiert): $title"
    continue
  fi
  { printf 'Quelle: [`%s`](https://github.com/%s/blob/main/%s)\n\n' "$rel" "$repo" "$rel"; cat "$tmp/body.md"; } > "$tmp/issue.md"

  label_args=()
  IFS=',' read -ra labels <<< "$epics"
  for l in ${labels[@]+"${labels[@]}"}; do
    [ -n "$l" ] || continue
    gh label create "$l" --repo "$repo" --color c5def5 --description "Epic $l" 2>/dev/null || true
    label_args+=(--label "$l")
  done

  url=$(gh issue create --repo "$repo" --title "$title" --body-file "$tmp/issue.md" ${label_args[@]+"${label_args[@]}"})
  echo "$title" >> "$tmp/titles"
  echo "$state  $url  $title"
  if [ "$state" = "resolved" ]; then
    gh issue close "$url" --repo "$repo" --reason completed >/dev/null
  fi
done
