#!/usr/bin/env bash
# pg_backup.sh — dump mini_lms database to a timestamped gzip file.
# Usage: pg_backup.sh [BACKUP_DIR]
# Env:   DB_HOST DB_PORT DB_USER DB_NAME BACKUP_RETAIN_DAYS
set -euo pipefail

BACKUP_DIR="${1:-/backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-lms}"
DB_NAME="${DB_NAME:-mini_lms}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%dT%H%M%S")
FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[pg_backup] dumping $DB_NAME to $FILE"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
echo "[pg_backup] done — $(du -sh "$FILE" | cut -f1)"

# Prune old backups
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "[pg_backup] pruned backups older than ${RETAIN_DAYS} days"
