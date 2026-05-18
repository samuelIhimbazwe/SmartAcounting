#!/usr/bin/env bash
# Usage: ./scripts/smoke-staging.sh https://staging.example.com
set -euo pipefail
BASE="${1:-http://localhost}"
API="${BASE%/}/api/v1"

echo "==> Health"
curl -fsS "${BASE%/}/actuator/health" | head -c 200
echo

echo "==> Auth rate limit headers (expect 401/400 without body)"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "login without creds: HTTP $code"

echo "==> OpenAPI"
curl -fsS -o /dev/null -w "swagger-ui: %{http_code}\n" "${BASE%/}/swagger-ui/index.html" || true

echo "==> Done (manual: login ceo/password on demo tenant)"
