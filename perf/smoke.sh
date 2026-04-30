#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
SC_USERNAME="${SC_USERNAME:-cfo}"
SC_PASSWORD="${SC_PASSWORD:-password}"
SC_TENANT_ID="${SC_TENANT_ID:-11111111-1111-1111-1111-111111111111}"
SC_USER_ID="${SC_USER_ID:-22222222-2222-2222-2222-222222222222}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_DIR="${ROOT_DIR}/k6"
REPORT_DIR="${PWD}/build/reports/performance"
mkdir -p "${REPORT_DIR}"

DASHBOARD_JSON="${REPORT_DIR}/dashboard-kpi-summary.json"
COPILOT_JSON="${REPORT_DIR}/copilot-query-summary.json"
REPORT_MD="${REPORT_DIR}/performance-smoke-report.md"

export BASE_URL SC_USERNAME SC_PASSWORD SC_TENANT_ID SC_USER_ID

echo "Running dashboard KPI smoke..."
k6 run "${K6_DIR}/dashboard-kpi.js" --summary-export "${DASHBOARD_JSON}"

echo "Running copilot query smoke..."
k6 run "${K6_DIR}/copilot-query.js" --summary-export "${COPILOT_JSON}"

echo "Generating combined report..."
python "${K6_DIR}/generate_summary.py" "${DASHBOARD_JSON}" "${COPILOT_JSON}" "${REPORT_MD}"

echo "Done. Report: ${REPORT_MD}"
