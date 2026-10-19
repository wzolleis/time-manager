#!/usr/bin/env bash
# Framework für interaktive API-Walkthroughs (wird per "source" geladen).
#
# Verwendung in einem Test-Skript:
#   source "$SCRIPT_DIR/lib/walkthrough.sh"
#   WT_CLEANUP=mein_aufraeumen        # optional: Funktion, die zuletzt läuft
#   wt_init "$@"
#   wt_step "Titel" 201 "erwarteter Text" POST /api/x '{"a":1}'
#
# Stellt bereit: wt_init, wt_step, wt_call, wt_id, WT_BASE, WT_STATUS, WT_BODY, WT_TOKEN

WT_MODE="step"          # step | until-fail | auto
WT_STEPPING=1           # 1 = nach jedem Schritt pausieren
WT_N=0; WT_PASS=0; WT_FAIL=0
WT_STATUS=""; WT_BODY=""
WT_CLEANUP="${WT_CLEANUP:-}"
WT_AUTH_USER=""; WT_AUTH_PASSWORD=""
WT_COOKIES=""           # Cookie-Datei mit der Session nach dem Login
WT_TOKEN=""             # gesetzt: wt_call schickt es als Bearer-Token

if [ -t 1 ]; then
  C_OK=$'\033[32m'; C_BAD=$'\033[31m'; C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'; C_OFF=$'\033[0m'
else
  C_OK=""; C_BAD=""; C_DIM=""; C_BOLD=""; C_OFF=""
fi

wt_usage() {
  cat <<'EOF'
Aufruf: <skript> [-s | -f | -a] [-h]

  -s, --step         Pause nach jedem Schritt (Standard)
  -f, --until-fail   Ohne Pause bis zum ersten Fehler, danach Einzelschritt
  -a, --auto         Nie pausieren (CI), Exit-Code 1 bei Fehlern
  -h, --help         Diese Hilfe

Umgebungsvariablen: API_USER (E-Mail), API_PASSWORD, BASE_URL (Standard http://localhost:8889, die Testdatenbank
über npm run dev:test; http://localhost:8888 ist npx netlify dev mit der lokalen Datenbank)
API_USER und API_PASSWORD können auch in .env.local neben dem Skript stehen (Zeilen KEY=VALUE),
gesetzte Umgebungsvariablen gehen vor. Fehlt beides, fragt das Skript nach.
Während einer Pause: beliebige Taste = weiter, q = beenden (mit Aufräumen)
EOF
}

wt_init() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -s|--step) WT_MODE="step" ;;
      -f|--until-fail) WT_MODE="until-fail" ;;
      -a|--auto) WT_MODE="auto" ;;
      -h|--help) wt_usage; exit 0 ;;
      *) echo "Unbekannter Parameter: $1"; wt_usage; exit 2 ;;
    esac
    shift
  done

  if [ "$WT_MODE" != "auto" ] && [ ! -t 0 ]; then
    echo "stdin ist kein Terminal, Tastendruck nicht möglich: wechsle zu --auto"
    WT_MODE="auto"
  fi
  if [ "$WT_MODE" = "step" ]; then WT_STEPPING=1; else WT_STEPPING=0; fi

  WT_BASE="${BASE_URL:-http://localhost:8889}" # npm run dev:test, Testdatenbank
  wt_load_env_local "$(dirname "$0")/.env.local"
  WT_AUTH_USER="${API_USER:-}"
  WT_AUTH_PASSWORD="${API_PASSWORD:-}"
  if [ -z "$WT_AUTH_USER" ]; then read -r -p "E-Mail: " WT_AUTH_USER; fi
  if [ -z "$WT_AUTH_PASSWORD" ]; then read -r -s -p "Passwort: " WT_AUTH_PASSWORD; echo; fi

  trap wt_exit EXIT
  trap 'exit 130' INT TERM

  wt_login

  echo "${C_BOLD}Ziel:${C_OFF} $WT_BASE   ${C_BOLD}Modus:${C_OFF} $WT_MODE"
}

# Liest API_USER und API_PASSWORD aus einer Datei mit Zeilen KEY=VALUE (z. B. scripts/.env.local).
# Die Datei wird nicht ausgeführt, nur gelesen. Schon gesetzte Umgebungsvariablen haben Vorrang.
wt_load_env_local() {
  local file="$1" line key value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?(API_USER|API_PASSWORD)[[:space:]]*=(.*)$ ]] || continue
    key="${BASH_REMATCH[2]}"
    value="${BASH_REMATCH[3]}"
    # Umschließende Anführungszeichen entfernen: "…" oder '…'
    if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then value="${BASH_REMATCH[1]}"; fi
    if [ -z "${!key:-}" ]; then printf -v "$key" '%s' "$value"; fi
  done < "$file"
}

# Bricht vor dem ersten Schritt ab: ohne Aufräumen und ohne Ergebnis, es ist noch nichts passiert
wt_abort() {
  echo "${C_BAD}$1${C_OFF}"
  trap - EXIT
  rm -f "$WT_COOKIES"
  exit 1
}

# Meldet sich an und merkt sich das Session-Cookie für alle weiteren Aufrufe
wt_login() {
  WT_COOKIES="$(mktemp)"
  local body status pw
  # Backslash und Anführungszeichen im Passwort für JSON maskieren
  pw="${WT_AUTH_PASSWORD//\\/\\\\}"
  pw="${pw//\"/\\\"}"
  body=$(printf '{"email":"%s","password":"%s"}' "$WT_AUTH_USER" "$pw")
  status=$(curl -s -o /dev/null -w '%{http_code}' -c "$WT_COOKIES" \
    -H "Content-Type: application/json" -d "$body" "$WT_BASE/api/auth/login") || status="000"
  # 000: curl hat keine Antwort bekommen, unter WT_BASE läuft kein Server
  if [ "$status" = "000" ]; then
    if [ "$WT_BASE" = "http://localhost:8889" ]; then
      wt_abort "der Server läuft nicht, bitte mit npm run dev:test starten"
    fi
    wt_abort "der Server läuft nicht unter $WT_BASE, bitte starten (npx netlify dev für Port 8888)"
  fi
  if [ "$status" != "200" ]; then
    wt_abort "Anmeldung fehlgeschlagen (HTTP $status)"
  fi
}

# wt_call METHOD PATH [BODY]  ->  setzt WT_STATUS und WT_BODY
wt_call() {
  local method="$1" path="$2" body="${3:-}" out
  local args=(-s -b "$WT_COOKIES" -X "$method" -w $'\n%{http_code}')
  if [ -n "$body" ]; then args+=(-H "Content-Type: application/json" -d "$body"); fi
  # Agent-Token für /api/mcp; der MCP-Transport verlangt beide Formate im Accept-Header
  if [ -n "$WT_TOKEN" ]; then
    args+=(-H "Authorization: Bearer $WT_TOKEN" -H "Accept: application/json, text/event-stream")
  fi
  if ! out=$(curl "${args[@]}" "$WT_BASE$path"); then
    WT_STATUS="000"
    WT_BODY="curl-Fehler (läuft der Server unter $WT_BASE?)"
    return
  fi
  WT_STATUS="${out##*$'\n'}"
  WT_BODY="${out%$'\n'*}"
}

# Erste "id" aus einer JSON-Antwort
wt_id() { printf '%s' "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

wt_pause() {
  if [ "$WT_STEPPING" -ne 1 ]; then return 0; fi
  local key
  read -r -n 1 -s -p "  ${C_DIM}[beliebige Taste = weiter, q = beenden]${C_OFF} " key
  echo
  case "$key" in q|Q) exit 0 ;; esac
}

# wt_step TITEL ERWARTETER_STATUS ERWARTETER_TEXT METHOD PATH [BODY]
# ERWARTETER_TEXT darf leer sein: dann wird nur der Status geprüft
wt_step() {
  local title="$1" want="$2" contains="$3" method="$4" path="$5" body="${6:-}"
  WT_N=$((WT_N + 1))
  echo
  echo "${C_DIM}────────────────────────────────────────────────────${C_OFF}"
  echo "${C_BOLD}Schritt $WT_N: $title${C_OFF}"
  echo "  $method $path"
  if [ -n "$body" ]; then echo "  Body:    $body"; fi

  wt_call "$method" "$path" "$body"
  echo "  Antwort: ${WT_BODY:-<leer>}"

    # JSON maskiert Anführungszeichen im Text als \" – für den Vergleich beide Formen prüfen
    local bs='\' q='"'
    local unescaped="${WT_BODY//"$bs$q"/$q}"

    local ok=1
    if [ "$WT_STATUS" != "$want" ]; then ok=0; fi
    if [ -n "$contains" ] && [[ "$WT_BODY" != *"$contains"* ]] && [[ "$unescaped" != *"$contains"* ]]; then
      ok=0
    fi

  if [ "$ok" -eq 1 ]; then
    WT_PASS=$((WT_PASS + 1))
    echo "  Status:  $WT_STATUS (erwartet $want)  ${C_OK}✔${C_OFF}"
  else
    WT_FAIL=$((WT_FAIL + 1))
    echo "  Status:  $WT_STATUS (erwartet $want)  ${C_BAD}✘ FEHLER${C_OFF}"
    if [ -n "$contains" ]; then echo "  Erwartet im Text: $contains"; fi
    if [ "$WT_MODE" = "until-fail" ] && [ "$WT_STEPPING" -eq 0 ]; then
      WT_STEPPING=1
      echo "  ${C_BAD}Erster Fehler in Schritt $WT_N: ab jetzt Einzelschritt.${C_OFF}"
    fi
  fi
  wt_pause
}

wt_exit() {
  local code=$?
  trap - EXIT
  if [ -n "$WT_CLEANUP" ]; then
    echo
    echo "${C_DIM}────────────────────────────────────────────────────${C_OFF}"
    echo "Aufräumen …"
    "$WT_CLEANUP"
  fi
  if [ -n "$WT_COOKIES" ]; then
    curl -s -o /dev/null -b "$WT_COOKIES" -X POST "$WT_BASE/api/auth/logout" || true
    rm -f "$WT_COOKIES"
  fi
  echo
  if [ "$WT_FAIL" -gt 0 ]; then
    echo "${C_BAD}${C_BOLD}Ergebnis: $WT_PASS bestanden, $WT_FAIL fehlgeschlagen (von $WT_N Schritten)${C_OFF}"
    exit 1
  fi
  echo "${C_OK}${C_BOLD}Ergebnis: $WT_PASS bestanden, 0 fehlgeschlagen (von $WT_N Schritten)${C_OFF}"
  exit "$code"
}