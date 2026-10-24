#!/usr/bin/env bash
# API-Walkthrough: Anmeldung, Rollen, Users, Projekte, Zeitbuchungen, Projektzuordnung, Urlaub, Krankmeldung,
# Überstunden, Feiertage, Rechte auf die Daten eines Users, Agent-Tokens, MCP-Server.
# Läuft mit einem Wegwerf-User "vitest" und räumt hinterher auf.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/walkthrough.sh"

TEST_EMAIL="vitest@example.com"
TEST_PASSWORD="vitest-passwort-1"
UNKNOWN_ID="00000000-0000-4000-8000-000000000000"
USER_ID=""
PROJECT_IDS=""
ADMIN_TOKEN_ID=""
GLOBAL_HOL=""
ADMIN_COOKIES=""
TEST_COOKIES=""
# Feste IDs der Rollen, wie in shared/role.ts
ADMIN_ROLE_ID="c8d47966-f04b-4e73-a752-b48266371049"
USER_ROLE_ID="65c4543a-6a98-44c6-b953-6329d1688bd0"

# Aufruf beim Aufräumen: Erfolg (2xx) oder schon weg (410), sonst Meldung mit Aufruf und Antwort
purge_call() {
  wt_call "$1" "$2"
  case "$WT_STATUS" in
    2??|410) return 0 ;;
  esac
  echo "${C_BAD}Aufräumen gescheitert: $1 $2 → $WT_STATUS ${WT_BODY}${C_OFF}"
  return 1
}

# Löscht den Test-User mit allem, was auf ihn verweist. Gibt 1 zurück, sobald ein Aufruf scheitert.
purge_user() {
  local uid="$1" ids id
  purge_call GET "/api/users/$uid/time-entries" || return 1
  # Von der letzten zur ersten Buchung, damit die Abfolge nach jedem Löschen gültig bleibt
  ids=$(printf '%s' "$WT_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 \
        | awk '{a[NR]=$0} END{for(i=NR;i>=1;i--) print a[i]}')
  for id in $ids; do purge_call DELETE "/api/users/$uid/time-entries/$id" || return 1; done

  purge_call GET "/api/users/$uid/vacations" || return 1
  for id in $(printf '%s' "$WT_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
    purge_call DELETE "/api/users/$uid/vacations/$id" || return 1
  done

  purge_call GET "/api/users/$uid/sick-leaves" || return 1
  for id in $(printf '%s' "$WT_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
    purge_call DELETE "/api/users/$uid/sick-leaves/$id" || return 1
  done

  # Eigene Feiertage des Users (nicht die globalen): holidays.user_id hat kein onDelete cascade
  purge_call GET "/api/users/$uid/holidays" || return 1
  for id in $(printf '%s' "$WT_BODY" | grep -o "{[^{}]*\"userId\":\"$uid\"[^{}]*}" \
              | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
    purge_call DELETE "/api/users/$uid/holidays/$id" || return 1
  done

  purge_call DELETE "/api/users/$uid"
}

cleanup() {
  local pid
  # Falls der Lauf als 'vitest' abgebrochen wurde: zurück zur Session des Admins
  if [ -n "$ADMIN_COOKIES" ]; then WT_COOKIES="$ADMIN_COOKIES"; fi
  if [ -n "$TEST_COOKIES" ]; then rm -f "$TEST_COOKIES"; fi
  for pid in $PROJECT_IDS; do wt_call DELETE "/api/projects/$pid"; done
  # Die Tokens von 'vitest' verschwinden mit dem User, das des Admins nicht
  if [ -n "$ADMIN_TOKEN_ID" ]; then wt_call DELETE "/api/api-tokens/$ADMIN_TOKEN_ID"; fi
  if [ -n "$GLOBAL_HOL" ]; then wt_call DELETE "/api/holidays/$GLOBAL_HOL"; fi
  if [ -n "$USER_ID" ]; then purge_user "$USER_ID" || echo "Der Test-User bleibt, der nächste Lauf räumt ihn auf."; fi
}
# shellcheck disable=SC2034
WT_CLEANUP=cleanup

wt_init "$@"

# --- Vorbereitung ----------------------------------------------------------

wt_call GET /api/users
if [ "$WT_STATUS" != "200" ]; then
  echo "Server nicht nutzbar: Status $WT_STATUS ($WT_BODY)"
  echo "Läuft 'npm run dev:test'? Stimmen E-Mail und Passwort?"
  exit 1
fi

OLD=$(printf '%s' "$WT_BODY" | grep -o "{[^{}]*\"email\":\"$TEST_EMAIL\"[^{}]*}" \
      | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$OLD" ]; then
  echo "Test-User eines früheren Laufs gefunden, räume auf …"
  purge_user "$OLD" || { echo "Abbruch: der Test-User eines früheren Laufs lässt sich nicht löschen."; exit 1; }
fi

# --- Anmeldung -------------------------------------------------------------

wt_step "Eigener User über /me" 200 "\"email\":\"$(printf '%s' "$WT_AUTH_USER" | tr '[:upper:]' '[:lower:]')\"" GET /api/auth/me

wt_step "Login mit falschem Passwort" 401 "E-Mail oder Passwort ist falsch" POST /api/auth/login \
  "{\"email\":\"$WT_AUTH_USER\",\"password\":\"sicher-falsch-123\"}"

wt_step "Login mit unbekannter E-Mail (gleiche Meldung)" 401 "E-Mail oder Passwort ist falsch" POST /api/auth/login \
  '{"email":"gibt-es-nicht@example.com","password":"egal-12345"}'

wt_step "Passwort ändern mit falschem bisherigen Passwort" 400 "bisherige Passwort ist falsch" \
  POST /api/auth/password '{"oldPassword":"sicher-falsch-123","newPassword":"egal-12345"}'

# --- Users -----------------------------------------------------------------

wt_step "User 'vitest' anlegen" 201 '"name":"vitest"' POST /api/users \
  "{\"name\":\"vitest\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
USER_ID=$(wt_id "$WT_BODY")
if [ -z "$USER_ID" ]; then echo "Test-User konnte nicht angelegt werden, Abbruch."; exit 1; fi
if [[ "$WT_BODY" == *password* ]]; then echo "${C_BAD}Antwort enthält das Passwort bzw. den Hash!${C_OFF}"; WT_FAIL=$((WT_FAIL + 1)); fi

wt_step "User ohne Passwort wird abgelehnt" 400 "password" POST /api/users \
  '{"name":"ohne passwort","email":"ohne-passwort@example.com"}'

wt_step "Zu kurzes Passwort wird abgelehnt" 400 "mindestens" POST /api/users \
  '{"name":"kurz","email":"kurz@example.com","password":"kurz"}'

wt_step "Login als 'vitest'" 200 "\"email\":\"$TEST_EMAIL\"" POST /api/auth/login \
  "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"

wt_step "Admin setzt das Passwort von 'vitest' zurück" 204 "" POST /api/auth/reset-password \
  "{\"userId\":\"$USER_ID\",\"password\":\"vitest-neu-12345\"}"

wt_step "Altes Passwort gilt nicht mehr" 401 "" POST /api/auth/login \
  "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"

wt_step "Neues Passwort gilt" 200 "" POST /api/auth/login \
  "{\"email\":\"$TEST_EMAIL\",\"password\":\"vitest-neu-12345\"}"

# --- Rollen ----------------------------------------------------------------

wt_step "Alle Rollen auflisten" 200 "{\"id\":\"$ADMIN_ROLE_ID\",\"name\":\"Administrator\"}" GET /api/roles

wt_step "Neuer User hat die Rolle 'User'" 200 "[{\"id\":\"$USER_ROLE_ID\",\"name\":\"User\"}]" GET "/api/users/$USER_ID/roles"

wt_step "Unbekannte Rolle wird abgelehnt" 400 "Unbekannte Rolle" PUT "/api/users/$USER_ID/roles" \
  "{\"roleIds\":[\"$USER_ROLE_ID\",\"$UNKNOWN_ID\"]}"

# Ab hier mit einer eigenen Session als 'vitest' (die Session des Admins bleibt bestehen)
ADMIN_COOKIES="$WT_COOKIES"
TEST_COOKIES="$(mktemp)"
curl -s -o /dev/null -c "$TEST_COOKIES" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"vitest-neu-12345\"}" "$WT_BASE/api/auth/login"
WT_COOKIES="$TEST_COOKIES"

wt_step "'vitest' darf Projekte lesen (ohne Eintrag gilt 'User')" 200 "" GET /api/projects

wt_step "'vitest' darf keine User auflisten" 403 "notwendigen Rechte" GET /api/users

wt_step "'vitest' darf kein Passwort zurücksetzen" 403 "notwendigen Rechte" POST /api/auth/reset-password \
  "{\"userId\":\"$USER_ID\",\"password\":\"egal-12345\"}"

wt_step "'vitest' darf sich nicht selbst zum Administrator machen" 403 "notwendigen Rechte" \
  PUT "/api/users/$USER_ID/roles" "{\"roleIds\":[\"$ADMIN_ROLE_ID\",\"$USER_ROLE_ID\"]}"

WT_COOKIES="$ADMIN_COOKIES"
wt_step "Admin macht 'vitest' zum Administrator" 200 '"Administrator"' PUT "/api/users/$USER_ID/roles" \
  "{\"roleIds\":[\"$ADMIN_ROLE_ID\",\"$USER_ROLE_ID\"]}"

WT_COOKIES="$TEST_COOKIES"
wt_step "Als Administrator darf 'vitest' die User auflisten" 200 "\"email\":\"$TEST_EMAIL\"" GET /api/users

WT_COOKIES="$ADMIN_COOKIES"
wt_step "Admin nimmt 'vitest' die Rolle wieder weg" 200 "[{\"id\":\"$USER_ROLE_ID\",\"name\":\"User\"}]" \
  PUT "/api/users/$USER_ID/roles" "{\"roleIds\":[\"$USER_ROLE_ID\"]}"

curl -s -o /dev/null -b "$TEST_COOKIES" -X POST "$WT_BASE/api/auth/logout"
rm -f "$TEST_COOKIES"
TEST_COOKIES=""
ADMIN_COOKIES=""

wt_step "Reset für unbekannten User" 410 "Nicht gefunden" POST /api/auth/reset-password \
  "{\"userId\":\"$UNKNOWN_ID\",\"password\":\"egal-12345\"}"

wt_step "Doppelte E-Mail wird abgelehnt" 409 "existiert bereits" POST /api/users \
  "{\"name\":\"vitest 2\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"

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

ENTRY="/api/users/$USER_ID/time-entries"
booking() { printf '{"type":"%s","bookedAt":"%s"}' "$1" "$2"; }

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
  GET "$ENTRY"

wt_step "Zeitraum-Filter (nur 12:00 und 12:30)" 200 '"bookedAt":"2026-06-10T10:30:00.000Z"' \
  GET "$ENTRY?from=2026-06-10T10:00:00Z&to=2026-06-10T11:00:00Z"

wt_step "Korrektur: gehen auf 11:45 (innerhalb der Lücke)" 200 '"bookedAt":"2026-06-10T09:45:00.000Z"' \
  PATCH "$ENTRY/$GEHEN1" '{"bookedAt":"2026-06-10T09:45:00Z"}'

wt_step "gehen vor das erste kommen schieben wird abgelehnt" 422 'fehlt vorher ein "kommen"' \
  PATCH "$ENTRY/$GEHEN1" '{"bookedAt":"2026-06-10T05:00:00Z"}'

wt_step "Einzelnes mittleres kommen löschen wird abgelehnt" 422 "" DELETE "$ENTRY/$KOMMEN2"

wt_step "Paar löschen mit ?pair=true" 204 "" DELETE "$ENTRY/$KOMMEN2?pair=true"

wt_step "Liste: nur noch kommen und gehen" 200 '"bookedAt":"2026-06-10T09:45:00.000Z"' \
  GET "$ENTRY"

wt_step "Unbekannter User wird abgelehnt" 400 "existiert nicht" POST "/api/users/$UNKNOWN_ID/time-entries" \
  "$(booking kommen 2026-06-11T06:00:00Z)"

wt_step "Ungültige Zeit wird abgelehnt" 400 "" POST $ENTRY "$(booking kommen kein-datum)"

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

VAC="/api/users/$USER_ID/vacations"
vacation() { printf '{"startDate":"%s","endDate":"%s"}' "$1" "$2"; }

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

wt_step "Unbekannter User wird abgelehnt" 400 "existiert nicht" POST "/api/users/$UNKNOWN_ID/vacations" \
  "$(vacation 2026-08-03 2026-08-07)"

wt_step "Liste enthält beide Urlaube" 200 '"startDate":"2026-06-13"' GET "$VAC"

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

wt_step "Der Zeitraum ist nach dem Löschen wieder frei" 201 '"startDate":"2026-06-13"' POST $VAC \
  "$(vacation 2026-06-13 2026-06-14)"

wt_step "Gelöschter Urlaub ist weg" 410 "Nicht gefunden" GET "$VAC/$VAC2"

# --- Krankmeldung ---------------------------------------------------------

SICK="/api/users/$USER_ID/sick-leaves"
sick() { printf '{"startDate":"%s","endDate":"%s"}' "$1" "$2"; }

wt_step "Krankmeldung im Urlaub ist erlaubt (10.06. bis 11.06.)" 201 '"startDate":"2026-06-10"' POST $SICK \
  "$(sick 2026-06-10 2026-06-11)"
SICK1=$(wt_id "$WT_BODY")

wt_step "Überschneidung mit einer Krankmeldung wird abgelehnt" 422 "Krankmeldung vom 10.06.2026" POST $SICK \
  "$(sick 2026-06-11 2026-06-12)"

wt_step "Ende vor Beginn wird abgelehnt" 400 "vor dem Beginn" POST $SICK "$(sick 2026-07-10 2026-07-01)"

wt_step "Notiz ändern" 200 '"note":"Attest liegt vor"' PATCH "$SICK/$SICK1" '{"note":"Attest liegt vor"}'

wt_step "Verlängern ohne Vergleich mit sich selbst" 200 '"endDate":"2026-06-12"' \
  PATCH "$SICK/$SICK1" '{"endDate":"2026-06-12"}'

wt_step "Liste enthält die Krankmeldung" 200 '"note":"Attest liegt vor"' GET "$SICK"

wt_step "Krankmeldung löschen" 204 "" DELETE "$SICK/$SICK1"

wt_step "Gelöschte Krankmeldung ist weg" 410 "Nicht gefunden" GET "$SICK/$SICK1"

# --- Eigene Daten ----------------------------------------------------------

wt_call GET /api/auth/me
ADMIN_ID=$(wt_id "$WT_BODY")
ADMIN_VAC="/api/users/$ADMIN_ID/vacations"
ADMIN_SICK="/api/users/$ADMIN_ID/sick-leaves"
ADMIN_ENTRY="/api/users/$ADMIN_ID/time-entries"
HOL="/api/users/$USER_ID/holidays"

# Ein Datensatz eines anderen Users unter dem eigenen Pfad: "nicht gefunden", nicht 403
wt_step "Urlaub von 'vitest' unter dem Pfad des Admins ist nicht gefunden" 410 "Nicht gefunden" \
  GET "$ADMIN_VAC/$VAC1"
wt_step "Buchung von 'vitest' unter dem Pfad des Admins ist nicht gefunden" 410 "Nicht gefunden" \
  PATCH "$ADMIN_ENTRY/$KOMMEN1" '{"bookedAt":"2026-06-10T06:10:00Z"}'

wt_step "Admin legt einen globalen Feiertag an" 201 '"userId":null' POST /api/holidays \
  '{"date":"2026-06-24","name":"vitest global"}'
GLOBAL_HOL=$(wt_id "$WT_BODY")

# Mit einer eigenen Session als 'vitest' (ohne Administrator-Rolle)
ADMIN_COOKIES="$WT_COOKIES"
TEST_COOKIES="$(mktemp)"
curl -s -o /dev/null -c "$TEST_COOKIES" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"vitest-neu-12345\"}" "$WT_BASE/api/auth/login"
WT_COOKIES="$TEST_COOKIES"

wt_step "'vitest' sieht die eigenen Urlaube" 200 '"startDate":"2026-06-13"' GET "$VAC"
wt_step "'vitest' sieht einen eigenen Urlaub" 200 '"startDate":"2026-06-09"' GET "$VAC/$VAC1"
wt_step "'vitest' sieht keine fremden Urlaube" 403 "notwendigen Rechte" GET "$ADMIN_VAC"
wt_step "'vitest' trägt keinen Urlaub für andere ein" 403 "notwendigen Rechte" POST "$ADMIN_VAC" \
  "$(vacation 2026-08-03 2026-08-07)"
wt_step "'vitest' ändert keinen Urlaub unter fremdem Pfad" 403 "notwendigen Rechte" \
  PATCH "$ADMIN_VAC/$VAC1" '{"endDate":"2026-06-11"}'

wt_step "'vitest' trägt eine eigene Krankmeldung ein" 201 '"startDate":"2026-07-01"' POST $SICK \
  "$(sick 2026-07-01 2026-07-02)"
SICK2=$(wt_id "$WT_BODY")
wt_step "'vitest' sieht keine fremden Krankmeldungen" 403 "notwendigen Rechte" GET "$ADMIN_SICK"
wt_step "'vitest' trägt keine Krankmeldung für andere ein" 403 "notwendigen Rechte" POST "$ADMIN_SICK" \
  "$(sick 2026-08-03 2026-08-07)"
wt_step "'vitest' löscht keine Krankmeldung unter fremdem Pfad" 403 "notwendigen Rechte" \
  DELETE "$ADMIN_SICK/$SICK2"
wt_step "'vitest' löscht die eigene Krankmeldung" 204 "" DELETE "$SICK/$SICK2"

# Überstunden: nur die eigenen, auch der Administrator sieht und korrigiert keine fremden
OVT="/api/users/$USER_ID/overtime"
wt_step "'vitest' hat noch keine Korrektur" 200 "null" GET "$OVT"
wt_step "'vitest' setzt den Korrekturwert" 200 '"offset":210' PUT "$OVT" '{"offset":210}'
wt_step "'vitest' überschreibt den Korrekturwert" 200 '"offset":-10' PUT "$OVT" '{"offset":-10}'
wt_step "Mehr als 23:59 wird abgelehnt" 422 "höchstens ±23:59" PUT "$OVT" '{"offset":1440}'
wt_step "Bruchteile von Minuten werden abgelehnt" 400 "offset" PUT "$OVT" '{"offset":1.5}'
wt_step "'vitest' sieht keine fremden Überstunden" 403 "notwendigen Rechte" GET "/api/users/$ADMIN_ID/overtime"
wt_step "'vitest' korrigiert keine fremden Überstunden" 403 "notwendigen Rechte" \
  PUT "/api/users/$ADMIN_ID/overtime" '{"offset":60}'

wt_step "'vitest' sieht die eigenen Buchungen" 200 "\"id\":\"$KOMMEN1\"" GET "$ENTRY"
wt_step "'vitest' sieht eine eigene Buchung" 200 "\"id\":\"$KOMMEN1\"" GET "$ENTRY/$KOMMEN1"
wt_step "'vitest' sieht keine fremden Buchungen" 403 "notwendigen Rechte" GET "$ADMIN_ENTRY"
wt_step "'vitest' bucht nicht für andere" 403 "notwendigen Rechte" POST "$ADMIN_ENTRY" \
  "$(booking kommen 2026-06-11T06:00:00Z)"

# Feiertage: globale nur lesen, eigene pflegen
wt_step "'vitest' trägt einen eigenen Feiertag ein" 201 "\"userId\":\"$USER_ID\"" POST "$HOL" \
  '{"date":"2026-06-25","name":"vitest eigener"}'
OWN_HOL=$(wt_id "$WT_BODY")
wt_step "'vitest' sieht globale und eigene Feiertage" 200 "\"id\":\"$GLOBAL_HOL\"" GET "$HOL"
if [[ "$WT_BODY" != *"$OWN_HOL"* ]]; then echo "${C_BAD}Der eigene Feiertag fehlt in der Liste!${C_OFF}"; WT_FAIL=$((WT_FAIL + 1)); fi
wt_step "'vitest' ändert den eigenen Feiertag" 200 '"name":"vitest geändert"' PATCH "$HOL/$OWN_HOL" \
  '{"name":"vitest geändert"}'
wt_step "Der eigene Feiertag ist unter /api/holidays nicht gefunden" 410 "Nicht gefunden" GET "/api/holidays/$OWN_HOL"
wt_step "Der globale Feiertag ist unter dem eigenen Pfad nicht gefunden" 410 "Nicht gefunden" \
  PATCH "$HOL/$GLOBAL_HOL" '{"name":"umbenannt"}'
wt_step "'vitest' darf globale Feiertage lesen" 200 "\"id\":\"$GLOBAL_HOL\"" GET /api/holidays
wt_step "'vitest' legt keinen globalen Feiertag an" 403 "notwendigen Rechte" POST /api/holidays \
  '{"date":"2026-06-26","name":"vitest global 2"}'
wt_step "'vitest' ändert keinen globalen Feiertag" 403 "notwendigen Rechte" PATCH "/api/holidays/$GLOBAL_HOL" \
  '{"name":"umbenannt"}'
wt_step "'vitest' löscht keinen globalen Feiertag" 403 "notwendigen Rechte" DELETE "/api/holidays/$GLOBAL_HOL"
wt_step "'vitest' sieht keine fremden Feiertage" 403 "notwendigen Rechte" GET "/api/users/$ADMIN_ID/holidays"
wt_step "'vitest' löscht den eigenen Feiertag" 204 "" DELETE "$HOL/$OWN_HOL"

WT_COOKIES="$ADMIN_COOKIES"
wt_step "Der Administrator sieht die Überstunden von 'vitest' nicht" 403 "notwendigen Rechte" GET "$OVT"
wt_step "Der Administrator korrigiert die Überstunden von 'vitest' nicht" 403 "notwendigen Rechte" \
  PUT "$OVT" '{"offset":60}'
wt_step "Der Administrator sieht die Urlaube von 'vitest'" 200 '"startDate":"2026-06-13"' GET "$VAC"
wt_step "Der Administrator trägt einen Feiertag für 'vitest' ein" 201 "\"userId\":\"$USER_ID\"" POST "$HOL" \
  '{"date":"2026-06-26","name":"vitest vom Admin"}'
wt_step "Der Administrator löscht den globalen Feiertag" 204 "" DELETE "/api/holidays/$GLOBAL_HOL"
GLOBAL_HOL=""

curl -s -o /dev/null -b "$TEST_COOKIES" -X POST "$WT_BASE/api/auth/logout"
rm -f "$TEST_COOKIES"
TEST_COOKIES=""
ADMIN_COOKIES=""

# --- Agent-Tokens ----------------------------------------------------------

TOK="/api/api-tokens"
ADMIN_TOK="/api/admin/api-tokens"

wt_step "Admin erzeugt ein eigenes Token ohne Ablauf" 201 '"expiresAt":null' POST $TOK \
  '{"name":"walkthrough admin","expiresInDays":null}'
ADMIN_TOKEN_ID=$(wt_id "$WT_BODY")
if [[ "$WT_BODY" != *'"token":"tm_'* ]]; then echo "${C_BAD}Antwort enthält kein Token!${C_OFF}"; WT_FAIL=$((WT_FAIL + 1)); fi

wt_step "Token ohne Namen wird abgelehnt" 400 "Namen" POST $TOK '{"name":"  ","expiresInDays":30}'
wt_step "Unbekannte Gültigkeit wird abgelehnt" 400 "expiresInDays" POST $TOK '{"name":"x","expiresInDays":7}'

wt_step "Liste der eigenen Tokens enthält es" 200 "\"id\":\"$ADMIN_TOKEN_ID\"" GET $TOK
if [[ "$WT_BODY" == *tokenHash* || "$WT_BODY" == *'"token"'* ]]; then
  echo "${C_BAD}Liste enthält Hash oder Token!${C_OFF}"; WT_FAIL=$((WT_FAIL + 1))
fi

ADMIN_COOKIES="$WT_COOKIES"
TEST_COOKIES="$(mktemp)"
curl -s -o /dev/null -c "$TEST_COOKIES" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"vitest-neu-12345\"}" "$WT_BASE/api/auth/login"
WT_COOKIES="$TEST_COOKIES"

wt_step "'vitest' erzeugt ein Token für 30 Tage" 201 '"name":"walkthrough vitest"' POST $TOK \
  '{"name":"walkthrough vitest","expiresInDays":30}'
TEST_TOKEN_ID=$(wt_id "$WT_BODY")
wt_step "'vitest' sieht nur die eigenen Tokens" 200 "\"id\":\"$TEST_TOKEN_ID\"" GET $TOK
if [[ "$WT_BODY" == *"$ADMIN_TOKEN_ID"* ]]; then
  echo "${C_BAD}'vitest' sieht ein fremdes Token!${C_OFF}"; WT_FAIL=$((WT_FAIL + 1))
fi
wt_step "'vitest' widerruft kein fremdes Token" 410 "Nicht gefunden" DELETE "$TOK/$ADMIN_TOKEN_ID"
wt_step "'vitest' sieht nicht die Tokens aller User" 403 "notwendigen Rechte" GET $ADMIN_TOK
wt_step "'vitest' widerruft nicht über die Admin-Liste" 403 "notwendigen Rechte" DELETE "$ADMIN_TOK/$ADMIN_TOKEN_ID"

WT_COOKIES="$ADMIN_COOKIES"
curl -s -o /dev/null -b "$TEST_COOKIES" -X POST "$WT_BASE/api/auth/logout"
rm -f "$TEST_COOKIES"
TEST_COOKIES=""
ADMIN_COOKIES=""

wt_step "Admin sieht das Token von 'vitest' mit Namen des Users" 200 '"userName":"vitest"' GET $ADMIN_TOK
wt_step "Admin widerruft das Token von 'vitest'" 204 "" DELETE "$ADMIN_TOK/$TEST_TOKEN_ID"
wt_step "Widerrufenes Token ist unbekannt" 410 "Nicht gefunden" DELETE "$ADMIN_TOK/$TEST_TOKEN_ID"
wt_step "Admin widerruft das eigene Token" 204 "" DELETE "$TOK/$ADMIN_TOKEN_ID"
ADMIN_TOKEN_ID=""

# --- MCP-Server (/api/mcp) -------------------------------------------------
# Als 'vitest' mit Agent-Token. 'vitest' hat Buchungen am 10.06.2026 und Urlaub am 09.–11.06. und 13.–14.06.

MCP="/api/mcp"
rpc() { printf '{"jsonrpc":"2.0","id":1,"method":"%s","params":%s}' "$1" "$2"; }
tool() {
  local args="${2:-}"
  if [ -z "$args" ]; then args='{}'; fi
  rpc tools/call "{\"name\":\"$1\",\"arguments\":$args}"
}

# mcp_step TITEL TOKEN ERWARTETER_TEXT TOOL [ARGUMENTE]: Aufruf eines Tools, das gelingen soll
mcp_step() {
  WT_TOKEN="$2"
  wt_step "$1" 200 "$3" POST $MCP "$(tool "$4" "${5:-}")"
  WT_TOKEN=""
  if [[ "$WT_BODY" == *'"isError":true'* ]]; then echo "${C_BAD}Unerwartetes isError!${C_OFF}"; WT_FAIL=$((WT_FAIL + 1)); fi
}

# mcp_error_step TITEL TOKEN ERWARTETE_MELDUNG TOOL [ARGUMENTE]: Tool-Fehler mit isError, kein Protokollfehler
mcp_error_step() {
  WT_TOKEN="$2"
  wt_step "$1" 200 "$3" POST $MCP "$(tool "$4" "${5:-}")"
  WT_TOKEN=""
  if [[ "$WT_BODY" != *'"isError":true'* ]]; then echo "${C_BAD}Kein isError!${C_OFF}"; WT_FAIL=$((WT_FAIL + 1)); fi
}

wt_step "Admin erzeugt ein Token für den MCP-Server" 201 '"token":"tm_' POST $TOK '{"name":"walkthrough mcp","expiresInDays":30}'
ADMIN_TOKEN_ID=$(wt_id "$WT_BODY")
ADMIN_MCP_TOKEN=$(printf '%s' "$WT_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

ADMIN_COOKIES="$WT_COOKIES"
TEST_COOKIES="$(mktemp)"
curl -s -o /dev/null -c "$TEST_COOKIES" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"vitest-neu-12345\"}" "$WT_BASE/api/auth/login"
WT_COOKIES="$TEST_COOKIES"

wt_step "'vitest' erzeugt ein Token für den MCP-Server" 201 '"token":"tm_' POST $TOK '{"name":"walkthrough mcp","expiresInDays":30}'
MCP_TOKEN_ID=$(wt_id "$WT_BODY")
MCP_TOKEN=$(printf '%s' "$WT_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

wt_step "/api/mcp mit Session-Cookie, ohne Token" 401 "Agent-Token" POST $MCP "$(rpc tools/list '{}')"
WT_COOKIES=/dev/null
wt_step "/api/mcp ohne Token" 401 "Agent-Token" POST $MCP "$(rpc tools/list '{}')"
WT_TOKEN="tm_falsch"
wt_step "/api/mcp mit falschem Token" 401 "Agent-Token" POST $MCP "$(rpc tools/list '{}')"
WT_TOKEN="$MCP_TOKEN"
wt_step "GET auf /api/mcp" 405 "" GET $MCP
wt_step "initialize" 200 '"name":"time-manager"' POST $MCP \
  "$(rpc initialize '{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"walkthrough","version":"1"}}')"
wt_step "tools/list enthält die Tools" 200 '"name":"delete_time_entry"' POST $MCP "$(rpc tools/list '{}')"
WT_TOKEN=""

mcp_step "get_overtime zeigt die Korrektur" "$MCP_TOKEN" '"offsetMinutes":-10' get_overtime
mcp_step "set_overtime_offset setzt +3:30" "$MCP_TOKEN" 'Korrektur gespeichert' set_overtime_offset \
  '{"sign":"+","hours":3,"minutes":30}'
mcp_step "get_overtime zeigt den neuen Wert" "$MCP_TOKEN" '"offset":"+3:30 h"' get_overtime
WT_TOKEN="$MCP_TOKEN"
wt_step "set_overtime_offset mit 24 Stunden" 200 '"isError":true' POST $MCP \
  "$(tool set_overtime_offset '{"sign":"+","hours":24,"minutes":0}')"
WT_TOKEN=""

mcp_step "stamp Kommen" "$MCP_TOKEN" '"type":"kommen"' stamp '{"type":"kommen"}'
STAMP_ID=$(wt_id "$WT_BODY")
mcp_error_step "stamp Kommen ein zweites Mal" "$MCP_TOKEN" 'fehlt vorher ein \"gehen\"' stamp '{"type":"kommen"}'
mcp_step "Gestempeltes Kommen löschen" "$MCP_TOKEN" "\"deletedIds\":[\"$STAMP_ID\"]" delete_time_entry "{\"id\":\"$STAMP_ID\"}"

mcp_error_step "add_time_entry Gehen mit Projekt" "$MCP_TOKEN" 'Ein Projekt kann nur beim \"kommen\"' add_time_entry \
  "{\"type\":\"gehen\",\"day\":\"2026-06-15\",\"time\":\"12:00\",\"projectId\":\"$UNKNOWN_ID\"}"
mcp_error_step "add_time_entry mit ungültigem Tag" "$MCP_TOKEN" "JJJJ-MM-TT" add_time_entry \
  '{"type":"kommen","day":"2026-02-30","time":"08:00"}'

mcp_step "Kommen 15.06. 08:00 nachtragen" "$MCP_TOKEN" '"bookedAt":"2026-06-15T08:00:00+02:00"' add_time_entry \
  '{"type":"kommen","day":"2026-06-15","time":"08:00"}'
MCP_KOMMEN=$(wt_id "$WT_BODY")
mcp_step "Gehen 12:00 nachtragen" "$MCP_TOKEN" '"type":"gehen"' add_time_entry \
  '{"type":"gehen","day":"2026-06-15","time":"12:00"}'
MCP_GEHEN=$(wt_id "$WT_BODY")
mcp_step "Kommen 13:00 nachtragen" "$MCP_TOKEN" '"time":"13:00"' add_time_entry \
  '{"type":"kommen","day":"2026-06-15","time":"13:00"}'
mcp_step "Gehen 17:00 nachtragen" "$MCP_TOKEN" '"time":"17:00"' add_time_entry \
  '{"type":"gehen","day":"2026-06-15","time":"17:00"}'

mcp_error_step "Gehen eines Paares mit folgendem Kommen löschen" "$MCP_TOKEN" 'fehlt vorher ein \"gehen\"' \
  delete_time_entry "{\"id\":\"$MCP_GEHEN\"}"
mcp_step "Nichts gelöscht: das Gehen ist noch da" "$MCP_TOKEN" "\"id\":\"$MCP_GEHEN\"" list_time_entries \
  '{"from":"2026-06-15","to":"2026-06-15"}'

mcp_step "Tagesbericht wie in der UI" "$MCP_TOKEN" "Arbeit 8 Std · Pause 1 Std · Soll 8 Std · Differenz ±0 Min" \
  get_daily_report '{"day":"2026-06-15"}'
mcp_step "Tagesbericht an einem Urlaubstag" "$MCP_TOKEN" '"kindText":"Urlaub"' \
  get_daily_report '{"day":"2026-06-10"}'
mcp_step "Wochenbericht" "$MCP_TOKEN" '"week":25' get_weekly_report '{"day":"2026-06-15"}'
mcp_step "Monatsbericht" "$MCP_TOKEN" '"monthText":"Juni 2026"' get_monthly_report '{"month":"2026-06"}'

mcp_error_step "Auch der Admin löscht keine fremde Buchung" "$ADMIN_MCP_TOKEN" "Buchung nicht gefunden" \
  delete_time_entry "{\"id\":\"$MCP_GEHEN\"}"
mcp_error_step "Auch der Admin ändert keine fremde Buchung" "$ADMIN_MCP_TOKEN" "Buchung nicht gefunden" \
  change_time_entry "{\"id\":\"$MCP_GEHEN\",\"time\":\"11:00\"}"

mcp_step "Erstes Paar mit pair löschen, obwohl ein Kommen folgt" "$MCP_TOKEN" \
  "\"deletedIds\":[\"$MCP_KOMMEN\",\"$MCP_GEHEN\"]" delete_time_entry "{\"id\":\"$MCP_KOMMEN\",\"pair\":true}"
mcp_step "Übrig bleibt 13:00 bis 17:00" "$MCP_TOKEN" "Arbeit 4 Std · Pause 0 Min" \
  get_daily_report '{"day":"2026-06-15"}'

WT_COOKIES="$TEST_COOKIES"
wt_step "'vitest' widerruft das Token" 204 "" DELETE "$TOK/$MCP_TOKEN_ID"
WT_COOKIES=/dev/null
WT_TOKEN="$MCP_TOKEN"
wt_step "/api/mcp mit widerrufenem Token" 401 "Agent-Token" POST $MCP "$(rpc tools/list '{}')"
WT_TOKEN=""
# Abgelaufene Tokens: lassen sich über die API nicht erzeugen, die Prüfung testet isTokenExpired

WT_COOKIES="$ADMIN_COOKIES"
curl -s -o /dev/null -b "$TEST_COOKIES" -X POST "$WT_BASE/api/auth/logout"
rm -f "$TEST_COOKIES"
TEST_COOKIES=""
ADMIN_COOKIES=""
wt_step "Admin widerruft das MCP-Token" 204 "" DELETE "$TOK/$ADMIN_TOKEN_ID"
ADMIN_TOKEN_ID=""

# --- Unbekannte IDs (Netlify wiederholt eine 410 mit .html) ------------------
for r in users projects holidays users/$USER_ID/time-entries users/$USER_ID/vacations users/$USER_ID/sick-leaves \
         users/$USER_ID/holidays; do
  wt_step "Unbekannte ID liefert 410 ($r)" 410 "Nicht gefunden" GET "/api/$r/$UNKNOWN_ID"
done

# --- User mit Buchungen ----------------------------------------------------

wt_step "User mit Buchungen lässt sich nicht löschen" 409 "Zeitbuchungen" \
  DELETE "/api/users/$USER_ID"

echo
echo "Alle Schritte durchlaufen."