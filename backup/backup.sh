#!/bin/sh
set -e

# Ensure required packages
apk add --no-cache mysql-client >/dev/null

backup_once() {
  now=$(date +'%Y-%m-%d_%H-%M-%S')
  dump="/backup/${DB_NAME}_${now}.sql"
  gzipfile="$dump.gz"

  echo "[backup] $(date) – dumping $DB_NAME …"
  mysqldump -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" \
            --single-transaction --routines --triggers "$DB_NAME" > "$dump"

  gzip "$dump"
  echo "[backup] dump created: $gzipfile"

  # Optional S3 upload
  if [ -n "$S3_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ]; then
    echo "[backup] uploading to s3://$S3_BUCKET/"
    # install awscli if missing
    if ! command -v aws >/dev/null 2>&1; then
      apk add --no-cache aws-cli >/dev/null
    fi
    aws s3 cp "$gzipfile" "s3://$S3_BUCKET/$(basename "$gzipfile")"
  fi

  # keep last 14 backups
  ls -1t /backup/*.gz | tail -n +15 | xargs -r rm -f || true
}

# first run immediately then every 24h at 03:05
first=true
while true; do
  if [ "$first" = true ]; then
    first=false
  else
    # calculate seconds until next 03:05
    next=$(date -d "tomorrow 03:05" +%s)
    now=$(date +%s)
    sleep $((next - now))
  fi
  backup_once
done 

