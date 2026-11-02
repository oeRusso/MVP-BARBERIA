#!/usr/bin/env bash
# Backup diario de MySQL: 14 días en el VPS y, si hay remoto, copia afuera.
# Programar en el crontab del servidor:
#   30 7 * * * /opt/barberia/backup.sh >> /opt/barberia/backups/backup.log 2>&1
set -euo pipefail

cd /opt/barberia
mkdir -p backups

set -a
# shellcheck disable=SC1091
source .env
set +a

file="backups/barberia-$(date +%F-%H%M).sql.gz"
tmp="$file.tmp"

docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql \
  mysqldump -uroot --single-transaction --routines --no-tablespaces barberia \
  | gzip > "$tmp"

# Un dump cortado no debe reemplazar a uno bueno.
gzip -t "$tmp"
zcat "$tmp" | tail -n 1 | grep -q "Dump completed"
mv "$tmp" "$file"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy "$file" "$BACKUP_REMOTE"
fi

find backups -name 'barberia-*.sql.gz' -mtime +14 -delete
echo "$(date -Is) backup listo: $file"
