#!/usr/bin/env bash
# API-Walkthrough: Users, Projekte, Zeitbuchungen, Projektzuordnung.
# Läuft mit einem Wegwerf-User "vitest" und räumt hinterher auf.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/walkthrough.sh"

TEST_EMAIL="vitest@example.com"
UNKNOWN_ID="00000000-0000-4000-8000-000000000000"
USER_ID=""
PROJECT_IDS=""

purge_user() {
  local uid="$1" ids id
  wt_call GET "/api/time-entries?userId=$uid"
  ids=$(printf '%s' "$WT_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 \
        | awk '{a[NR]=$0} END{for(i=NR;i>=1;i--) print a[i]}')
  for id in $ids; do wt_call DELETE "/api/time-entries/$id"; done

  wt_call GET "/api/vacations?userId=$uid"
  for id in $(printf '%s' "$WT_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
    wt_call DELETE "/api/vacations/$id"
  done

  wt_call DELETE "/api/users/$uid"
}

cleanup() {
  local pid
  for pid in $PROJECT_IDS; do wt_call DELETE "/api/projects/$pid"; done
  if [ -n "$USER_ID" ]; then purge_user "$USER_ID"; fi
}
# shellcheck disable=SC2034
WT_CLEANUP=cleanup

wt_init "$@"

# --- Vorbereitung ----------------------------------------------------------

wt_call GET /api/users
if [ "$WT_STATUS" != "200" ]; then
  echo "Server nicht nutzbar: Status $WT_STATUS ($WT_BODY)"
  echo "Läuft 'npx netlify dev'? Stimmen Benutzer und Passwort?"
  exit 1
fi

OLD=$(printf '%s' "$WT_BODY" | grep -o "{[^{}]*\"email\":\"$TEST_EMAIL\"[^{}]*}" \
      | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$OLD" ]; then
  echo "Test-User eines früheren Laufs gefunden, räume auf …"
  purge_user "$OLD"
fi

# --- Users -----------------------------------------------------------------

wt_step "User 'vitest' anlegen" 201 '"name":"vitest"' POST /api/users \
  "{\"name\":\"vitest\",\"email\":\"$TEST_EMAIL\"}"
USER_ID=$(wt_id "$WT_BODY")
if [ -z "$USER_ID" ]; then echo "Test-User konnte nicht angelegt werden, Abbruch."; exit 1; fi

wt_step "Doppelte E-Mail wird abgelehnt" 409 "existiert bereits" POST /api/users \
  "{\"name\":\"vitest 2\",\"email\":\"$TEST_EMAIL\"}"

wt_step "Ungültige Daten werden abgelehnt" 400 "" POST /api/users \
  '{"name":"","email":"kaputt"}'

wt_step "Avatar setzen" 200 '"avatarUrl":"https://example.com/a.png"' PATCH "/api/users/$USER_ID" \
  '{"avatarUrl":"https://example.com/a.png"}'

wt_step "Avatar entfernen (null)" 200 '"avatarUrl":null' PATCH "/api/users/$USER_ID" \
  '{"avatarUrl":null}'

# --- Projekte --------------------------------------------------------------

PNAME="vitest-$(date +%s)"

wt_step "Projekt anlegen" 201 "\"name\":\"$PNAME\"" POST /api/projects "{\"name\":\"$PNAME\"}"
PROJECT_ID=$(wt_id "$WT_BODY"); PROJECT_IDS="$PROJECT_IDS $PROJECT_ID"

wt_step "Doppelter Projektname wird abgelehnt" 409 "existiert bereits" POST /api/projects \
  "{\"name\":\"$PNAME\"}"

wt_step "Leerer Projektname wird abgelehnt" 400 "" POST /api/projects '{"name":"  "}'

wt_step "Projekt umbenennen" 200 "\"name\":\"$PNAME-neu\"" PATCH "/api/projects/$PROJECT_ID" \
  "{\"name\":\"$PNAME-neu\"}"

wt_step "Projektliste enthält das Projekt" 200 "$PNAME-neu" GET /api/projects

# --- Zeitbuchungen (Sommerzeit: 08:00 Berlin = 06:00 UTC) -------------------

ENTRY="/api/time-entries"
booking() { printf '{"userId":"%s","type":"%s","bookedAt":"%s"}' "$USER_ID" "$1" "$2"; }

wt_step "kommen 08:00 anlegen" 201 '"type":"kommen"' POST $ENTRY "$(booking kommen 2026-06-10T06:00:00Z)"
KOMMEN1=$(wt_id "$WT_BODY")

wt_step "Zweites kommen wird abgelehnt" 422 'fehlt vorher ein "gehen"' POST $ENTRY \
  "$(booking kommen 2026-06-10T07:00:00Z)"

wt_step "gehen 12:00 anlegen" 201 '"type":"gehen"' POST $ENTRY "$(booking gehen 2026-06-10T10:00:00Z)"
GEHEN1=$(wt_id "$WT_BODY")

wt_step "kommen 12:30 anlegen (Pause)" 201 '"type":"kommen"' POST $ENTRY "$(booking kommen 2026-06-10T10:30:00Z)"
KOMMEN2=$(wt_id "$WT_BODY")

wt_step "gehen 17:00 anlegen" 201 '"type":"gehen"' POST $ENTRY "$(booking gehen 2026-06-10T15:00:00Z)"

wt_step "Liste: vier Buchungen, Zeiten unverändert" 200 '"bookedAt":"2026-06-10T15:00:00.000Z"' \
  GET "$ENTRY?userId=$USER_ID"

wt_step "Zeitraum-Filter (nur 12:00 und 12:30)" 200 '"bookedAt":"2026-06-10T10:30:00.000Z"' \
  GET "$ENTRY?userId=$USER_ID&from=2026-06-10T10:00:00Z&to=2026-06-10T11:00:00Z"

wt_step "Korrektur: gehen auf 11:45 (innerhalb der Lücke)" 200 '"bookedAt":"2026-06-10T09:45:00.000Z"' \
  PATCH "$ENTRY/$GEHEN1" '{"bookedAt":"2026-06-10T09:45:00Z"}'

wt_step "gehen vor das erste kommen schieben wird abgelehnt" 422 'fehlt vorher ein "kommen"' \
  PATCH "$ENTRY/$GEHEN1" '{"bookedAt":"2026-06-10T05:00:00Z"}'

wt_step "Einzelnes mittleres kommen löschen wird abgelehnt" 422 "" DELETE "$ENTRY/$KOMMEN2"

wt_step "Paar löschen mit ?pair=true" 204 "" DELETE "$ENTRY/$KOMMEN2?pair=true"

wt_step "Liste: nur noch kommen und gehen" 200 '"bookedAt":"2026-06-10T09:45:00.000Z"' \
  GET "$ENTRY?userId=$USER_ID"

wt_step "Unbekannter User wird abgelehnt" 400 "existiert nicht" POST $ENTRY \
  "{\"userId\":\"$UNKNOWN_ID\",\"type\":\"kommen\",\"bookedAt\":\"2026-06-11T06:00:00Z\"}"

wt_step "Ungültige Zeit wird abgelehnt" 400 "" POST $ENTRY \
  "{\"userId\":\"$USER_ID\",\"type\":\"kommen\",\"bookedAt\":\"kein-datum\"}"

# --- Projektzuordnung ------------------------------------------------------

wt_step "Projekt einer Buchung zuordnen" 200 "\"projectId\":\"$PROJECT_ID\"" \
  PATCH "$ENTRY/$KOMMEN1" "{\"projectId\":\"$PROJECT_ID\"}"

wt_step "Unbekanntes Projekt wird abgelehnt" 400 "existiert nicht" \
  PATCH "$ENTRY/$KOMMEN1" "{\"projectId\":\"$UNKNOWN_ID\"}"

wt_step "Zeit ändern, Zuordnung bleibt" 200 "\"projectId\":\"$PROJECT_ID\"" \
  PATCH "$ENTRY/$KOMMEN1" '{"bookedAt":"2026-06-10T06:05:00Z"}'

wt_step "Zuordnung mit null entfernen" 200 '"projectId":null' \
  PATCH "$ENTRY/$KOMMEN1" '{"projectId":null}'

wt_step "Projekt wieder zuordnen" 200 "\"projectId\":\"$PROJECT_ID\"" \
  PATCH "$ENTRY/$KOMMEN1" "{\"projectId\":\"$PROJECT_ID\"}"

wt_step "Projekt löschen" 204 "" DELETE "/api/projects/$PROJECT_ID"

wt_step "Buchung bleibt bestehen, ohne Projekt" 200 '"projectId":null' GET "$ENTRY/$KOMMEN1"

# --- Urlaub ----------------------------------------------------------------

VAC="/api/vacations"
vacation() { printf '{"userId":"%s","startDate":"%s","endDate":"%s"}' "$USER_ID" "$1" "$2"; }

wt_step "Urlaub 08.06. bis 12.06. anlegen" 201 '"startDate":"2026-06-08"' POST $VAC \
  "$(vacation 2026-06-08 2026-06-12)"
VAC1=$(wt_id "$WT_BODY")

wt_step "Überschneidung wird abgelehnt (10.06. bis 15.06.)" 422 "Überschneidet sich" POST $VAC \
  "$(vacation 2026-06-10 2026-06-15)"

wt_step "Überschneidung am letzten Tag wird abgelehnt (12.06.)" 422 "Überschneidet sich" POST $VAC \
  "$(vacation 2026-06-12 2026-06-12)"

wt_step "Direkt angrenzender Urlaub ist erlaubt (13.06. bis 14.06.)" 201 '"endDate":"2026-06-14"' POST $VAC \
  "$(vacation 2026-06-13 2026-06-14)"
VAC2=$(wt_id "$WT_BODY")

wt_step "Ende vor Beginn wird abgelehnt" 400 "vor dem Beginn" POST $VAC \
  "$(vacation 2026-07-10 2026-07-01)"

wt_step "Ungültiges Datum wird abgelehnt" 400 "" POST $VAC \
  "$(vacation 2026-02-30 2026-03-02)"

wt_step "Unbekannter User wird abgelehnt" 400 "existiert nicht" POST $VAC \
  "{\"userId\":\"$UNKNOWN_ID\",\"startDate\":\"2026-08-03\",\"endDate\":\"2026-08-07\"}"

wt_step "Liste enthält beide Urlaube" 200 '"startDate":"2026-06-13"' GET "$VAC?userId=$USER_ID"

wt_step "Ende des ersten Urlaubs auf 11.06. ändern" 200 '"endDate":"2026-06-11"' \
  PATCH "$VAC/$VAC1" '{"endDate":"2026-06-11"}'

wt_step "Beginn nach das gespeicherte Ende schieben wird abgelehnt" 422 "vor dem Beginn" \
  PATCH "$VAC/$VAC1" '{"startDate":"2026-06-12"}'

wt_step "Verlängern in den zweiten Urlaub hinein wird abgelehnt" 422 "Überschneidet sich" \
  PATCH "$VAC/$VAC1" '{"endDate":"2026-06-13"}'

wt_step "Beginn ändern, ohne sich mit sich selbst zu überschneiden" 200 '"startDate":"2026-06-09"' \
  PATCH "$VAC/$VAC1" '{"startDate":"2026-06-09"}'

wt_step "Leerer Patch wird abgelehnt" 400 "" PATCH "$VAC/$VAC1" '{}'

wt_step "Urlaub löschen" 204 "" DELETE "$VAC/$VAC2"

wt_step "Gelöschter Urlaub ist weg" 404 "" GET "$VAC/$VAC2"

wt_step "Der Zeitraum ist nach dem Löschen wieder frei" 201 '"startDate":"2026-06-13"' POST $VAC \
  "$(vacation 2026-06-13 2026-06-14)"

# --- User mit Buchungen ----------------------------------------------------

wt_step "User mit Buchungen lässt sich nicht löschen" 409 "Zeitbuchungen" \
  DELETE "/api/users/$USER_ID"

echo
echo "Alle Schritte durchlaufen."