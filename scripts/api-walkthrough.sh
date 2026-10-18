#!/usr/bin/env bash
# API-Walkthrough: Anmeldung, Rollen, Users, Projekte, Zeitbuchungen, Projektzuordnung, Urlaub, Krankmeldung,
# Agent-Tokens.
# Läuft mit einem Wegwerf-User "vitest" und räumt hinterher auf.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/walkthrough.sh"

TEST_EMAIL="vitest@example.com"
TEST_PASSWORD="vitest-passwort-1"
UNKNOWN_ID="00000000-0000-4000-8000-000000000000"
USER_ID=""
PROJECT_IDS=""
ADMIN_TOKEN_ID=""
ADMIN_COOKIES=""
TEST_COOKIES=""
# Feste IDs der Rollen, wie in shared/role.ts
ADMIN_ROLE_ID="c8d47966-f04b-4e73-a752-b48266371049"
USER_ROLE_ID="65c4543a-6a98-44c6-b953-6329d1688bd0"

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

  wt_call GET "/api/sick-leaves?userId=$uid"
  for id in $(printf '%s' "$WT_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
    wt_call DELETE "/api/sick-leaves/$id"
  done

  wt_call DELETE "/api/users/$uid"
}

cleanup() {
  local pid
  # Falls der Lauf als 'vitest' abgebrochen wurde: zurück zur Session des Admins
  if [ -n "$ADMIN_COOKIES" ]; then WT_COOKIES="$ADMIN_COOKIES"; fi
  if [ -n "$TEST_COOKIES" ]; then rm -f "$TEST_COOKIES"; fi
  for pid in $PROJECT_IDS; do wt_call DELETE "/api/projects/$pid"; done
  # Die Tokens von 'vitest' verschwinden mit dem User, das des Admins nicht
  if [ -n "$ADMIN_TOKEN_ID" ]; then wt_call DELETE "/api/api-tokens/$ADMIN_TOKEN_ID"; fi
  if [ -n "$USER_ID" ]; then purge_user "$USER_ID"; fi
}
# shellcheck disable=SC2034
WT_CLEANUP=cleanup

wt_init "$@"

# --- Vorbereitung ----------------------------------------------------------

wt_call GET /api/users
if [ "$WT_STATUS" != "200" ]; then
  echo "Server nicht nutzbar: Status $WT_STATUS ($WT_BODY)"
  echo "Läuft 'npx netlify dev'? Stimmen E-Mail und Passwort?"
  exit 1
fi

OLD=$(printf '%s' "$WT_BODY" | grep -o "{[^{}]*\"email\":\"$TEST_EMAIL\"[^{}]*}" \
      | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$OLD" ]; then
  echo "Test-User eines früheren Laufs gefunden, räume auf …"
  purge_user "$OLD"
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

wt_step "Der Zeitraum ist nach dem Löschen wieder frei" 201 '"startDate":"2026-06-13"' POST $VAC \
  "$(vacation 2026-06-13 2026-06-14)"

wt_step "Gelöschter Urlaub ist weg" 410 "Nicht gefunden" GET "$VAC/$VAC2"

# --- Krankmeldung ---------------------------------------------------------

SICK="/api/sick-leaves"
sick() { printf '{"userId":"%s","startDate":"%s","endDate":"%s"}' "$USER_ID" "$1" "$2"; }

wt_step "Krankmeldung im Urlaub ist erlaubt (10.06. bis 11.06.)" 201 '"startDate":"2026-06-10"' POST $SICK \
  "$(sick 2026-06-10 2026-06-11)"
SICK1=$(wt_id "$WT_BODY")

wt_step "Überschneidung mit einer Krankmeldung wird abgelehnt" 422 "Krankmeldung vom 10.06.2026" POST $SICK \
  "$(sick 2026-06-11 2026-06-12)"

wt_step "Ende vor Beginn wird abgelehnt" 400 "vor dem Beginn" POST $SICK "$(sick 2026-07-10 2026-07-01)"

wt_step "Notiz ändern" 200 '"note":"Attest liegt vor"' PATCH "$SICK/$SICK1" '{"note":"Attest liegt vor"}'

wt_step "Verlängern ohne Vergleich mit sich selbst" 200 '"endDate":"2026-06-12"' \
  PATCH "$SICK/$SICK1" '{"endDate":"2026-06-12"}'

wt_step "Liste enthält die Krankmeldung" 200 '"note":"Attest liegt vor"' GET "$SICK?userId=$USER_ID"

wt_step "Krankmeldung löschen" 204 "" DELETE "$SICK/$SICK1"

wt_step "Gelöschte Krankmeldung ist weg" 410 "Nicht gefunden" GET "$SICK/$SICK1"

# --- Eigene Daten ----------------------------------------------------------

wt_call GET /api/auth/me
ADMIN_ID=$(wt_id "$WT_BODY")

# Mit einer eigenen Session als 'vitest' (ohne Administrator-Rolle)
ADMIN_COOKIES="$WT_COOKIES"
TEST_COOKIES="$(mktemp)"
curl -s -o /dev/null -c "$TEST_COOKIES" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"vitest-neu-12345\"}" "$WT_BASE/api/auth/login"
WT_COOKIES="$TEST_COOKIES"

wt_step "'vitest' sieht die eigenen Urlaube" 200 '"startDate":"2026-06-13"' GET "$VAC?userId=$USER_ID"
wt_step "'vitest' sieht ohne userId die eigenen Urlaube" 200 '"startDate":"2026-06-13"' GET "$VAC"
wt_step "'vitest' sieht einen eigenen Urlaub" 200 '"startDate":"2026-06-09"' GET "$VAC/$VAC1"
wt_step "'vitest' sieht keine fremden Urlaube" 403 "notwendigen Rechte" GET "$VAC?userId=$ADMIN_ID"
wt_step "'vitest' trägt keinen Urlaub für andere ein" 403 "notwendigen Rechte" POST $VAC \
  "{\"userId\":\"$ADMIN_ID\",\"startDate\":\"2026-08-03\",\"endDate\":\"2026-08-07\"}"

wt_step "'vitest' trägt eine eigene Krankmeldung ein" 201 '"startDate":"2026-07-01"' POST $SICK \
  "$(sick 2026-07-01 2026-07-02)"
SICK2=$(wt_id "$WT_BODY")
wt_step "'vitest' sieht keine fremden Krankmeldungen" 403 "notwendigen Rechte" GET "$SICK?userId=$ADMIN_ID"
wt_step "'vitest' trägt keine Krankmeldung für andere ein" 403 "notwendigen Rechte" POST $SICK \
  "{\"userId\":\"$ADMIN_ID\",\"startDate\":\"2026-08-03\",\"endDate\":\"2026-08-07\"}"
wt_step "'vitest' löscht die eigene Krankmeldung" 204 "" DELETE "$SICK/$SICK2"

wt_step "'vitest' sieht die eigenen Buchungen" 200 "\"id\":\"$KOMMEN1\"" GET "$ENTRY?userId=$USER_ID"
wt_step "'vitest' sieht eine eigene Buchung" 200 "\"id\":\"$KOMMEN1\"" GET "$ENTRY/$KOMMEN1"
wt_step "'vitest' sieht keine fremden Buchungen" 403 "notwendigen Rechte" GET "$ENTRY?userId=$ADMIN_ID"
wt_step "'vitest' bucht nicht für andere" 403 "notwendigen Rechte" POST $ENTRY \
  "{\"userId\":\"$ADMIN_ID\",\"type\":\"kommen\",\"bookedAt\":\"2026-06-11T06:00:00Z\"}"

WT_COOKIES="$ADMIN_COOKIES"
wt_step "Der Administrator sieht die Urlaube von 'vitest'" 200 '"startDate":"2026-06-13"' GET "$VAC?userId=$USER_ID"

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

# --- Unbekannte IDs (Netlify wiederholt eine 410 mit .html) ------------------
for r in users projects time-entries vacations sick-leaves; do
  wt_step "Unbekannte ID liefert 410 ($r)" 410 "Nicht gefunden" GET "/api/$r/$UNKNOWN_ID"
done

# --- User mit Buchungen ----------------------------------------------------

wt_step "User mit Buchungen lässt sich nicht löschen" 409 "Zeitbuchungen" \
  DELETE "/api/users/$USER_ID"

echo
echo "Alle Schritte durchlaufen."