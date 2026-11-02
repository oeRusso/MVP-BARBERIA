#!/usr/bin/env bash
# Comprueba un backup restaurándolo en una base aparte, sin tocar la real.
# Uso: ./restore-test.sh backups/barberia-AAAA-MM-DD-HHMM.sql.gz
set -euo pipefail

cd /opt/barberia
file="${1:?indicá el archivo de backup}"

set -a
# shellcheck disable=SC1091
source .env
set +a

mysql() {
  docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql mysql -uroot "$@"
}

trap 'mysql -e "DROP DATABASE IF EXISTS barberia_restore"' EXIT
mysql -e "DROP DATABASE IF EXISTS barberia_restore; CREATE DATABASE barberia_restore"
gunzip -c "$file" | mysql barberia_restore

mysql -N barberia_restore -e "
  SELECT 'usuarios', COUNT(*) FROM User
  UNION ALL SELECT 'turnos', COUNT(*) FROM Booking
  UNION ALL SELECT 'pagos', COUNT(*) FROM Payment"
echo "Backup restaurado correctamente"
