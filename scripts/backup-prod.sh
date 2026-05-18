#!/usr/bin/env bash
# Production PostgreSQL backup — gzip dump and optional S3 upload.
# Usage: DB_PASSWORD=... BACKUP_DIR=./backups ./scripts/backup-prod.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-smartchain}"
DB_USER="${DB_USERNAME:-smartchain}"
CONTAINER="${POSTGRES_CONTAINER:-accounting-postgres-1}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/smartchain_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  docker exec -e PGPASSWORD="${DB_PASSWORD:?Set DB_PASSWORD}" "${CONTAINER}" \
    pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILE}"
else
  PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILE}"
fi

if [[ -n "${BACKUP_BUCKET:-}" ]]; then
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "${FILE}" "s3://${BACKUP_BUCKET}/$(basename "${FILE}")"
  elif command -v gsutil >/dev/null 2>&1; then
    gsutil cp "${FILE}" "gs://${BACKUP_BUCKET}/$(basename "${FILE}")"
  else
    echo "BACKUP_BUCKET set but neither aws nor gsutil found" >&2
    exit 1
  fi
fi

find "${BACKUP_DIR}" -name 'smartchain_*.sql.gz' -mtime +7 -delete
echo "Backup OK: ${FILE}"
