#!/bin/sh
# Erzeugt einmalig das Zertifikat für den lokalen FTPS-Server (Service ftps in compose.yaml).
# netlify dev vertraut ihm über NODE_EXTRA_CA_CERTS in .env.local, siehe features/use-case/database-backup.md.
set -e
DIR=db/docker/ftps
[ -f "$DIR/pure-ftpd.pem" ] && exit 0
mkdir -p "$DIR"
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost" -keyout "$DIR/key.pem" -out "$DIR/cert.pem" 2>/dev/null
cat "$DIR/key.pem" "$DIR/cert.pem" > "$DIR/pure-ftpd.pem"
rm "$DIR/key.pem"
echo "Zertifikat erzeugt: $DIR/cert.pem"
