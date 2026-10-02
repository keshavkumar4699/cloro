#!/bin/sh
# Every 5 minutes: close ended auctions, expire offers, send "ending soon" reminders, tidy old alerts.
while true; do
  sleep 300
  wget -q -O - --header="Authorization: Bearer ${CRON_SECRET}" http://app:3000/api/cron/settle >/dev/null 2>&1 \
    || echo "cron call failed at $(date -u +%H:%M)" >&2
done
