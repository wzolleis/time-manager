#!/bin/bash
# Legt beim ersten Start des Containers (leeres Volume) die Testdatenbank an.
# Die Datenbank DB_NAME legt das MariaDB-Image selbst an (MARIADB_DATABASE).
set -e
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_TEST_NAME\`;
GRANT ALL ON \`$DB_TEST_NAME\`.* TO '$MARIADB_USER'@'%';
SQL
