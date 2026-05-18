#!/bin/bash
# Run daily via cron: 0 2 * * * /path/to/scripts/backup.sh

BACKUP_DIR="/backups"

# Create backup directory if it does not exist
mkdir -p "$BACKUP_DIR"

docker exec smartchain-postgres pg_dump -U smartchain smartchain > "$BACKUP_DIR/smartchain_$(date +%Y%m%d_%H%M%S).sql"

if [ $? -eq 0 ]; then
  echo "$(date): Backup succeeded" >> "$BACKUP_DIR/backup.log"
else
  echo "$(date): Backup FAILED" >> "$BACKUP_DIR/backup.log"
fi

find "$BACKUP_DIR" -name "smartchain_*.sql" -mtime +30 -delete
