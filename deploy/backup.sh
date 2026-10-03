#!/bin/sh
# Nightly PostgreSQL backup. Keeps 14 days locally; also copies to an S3-compatible bucket
# (e.g. Cloudflare R2's free 10 GB) when BACKUP_S3_BUCKET is set, so a dead server doesn't take your data with it.
set -eu
mkdir -p /backups
while true; do
  STAMP=$(date -u +%Y-%m-%d_%H%M)
  FILE="/backups/cloro_${STAMP}.sql.gz"
  if pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$FILE"; then
    echo "backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
    find /backups -name 'cloro_*.sql.gz' -mtime +14 -delete
    if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
      AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto \
        aws s3 cp "$FILE" "s3://$BACKUP_S3_BUCKET/db/" --endpoint-url "$BACKUP_S3_ENDPOINT" --only-show-errors \
        && echo "uploaded to s3://$BACKUP_S3_BUCKET/db/"
    fi
  else
    echo "backup FAILED at $STAMP" >&2
    rm -f "$FILE"
  fi
  sleep 86400
done
