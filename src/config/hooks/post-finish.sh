#!/bin/bash
WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
if [ -n "$WEBHOOK_URL" ]; then
  curl -X POST -H "Content-Type: application/json" -d "{\"text\":\"✅ Branch $1 finished successfully!\"}" "$WEBHOOK_URL"
fi