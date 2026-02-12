#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REPORT_DIR="$SCRIPT_DIR/test/reports"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
REPORT_FILE="$REPORT_DIR/e2e-report-${TIMESTAMP}.md"
RAW_OUTPUT="$(mktemp)"
JSON_OUTPUT="$(mktemp --suffix=.json)"

# ── 1. Start dev server via start.dev.sh ─────────────────────────────
echo "==> Running start.dev.sh (docker services + dev server)..."
"$SCRIPT_DIR/start.dev.sh" &
DEV_PID=$!

# Update cleanup to also stop the background dev server
cleanup() {
  rm -f "$RAW_OUTPUT" "$JSON_OUTPUT"
  if kill -0 "$DEV_PID" 2>/dev/null; then
    echo "==> Stopping dev server (PID $DEV_PID)..."
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Wait for the dev server to be ready (health-check on port 5000)
echo "==> Waiting for dev server to be ready on port 5000..."
RETRIES=0
MAX_RETRIES=60
until curl -sf http://localhost:5000/games > /dev/null 2>&1; do
  RETRIES=$(( RETRIES + 1 ))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "    ERROR: Dev server did not start within ${MAX_RETRIES}s"
    exit 1
  fi
  sleep 1
done
echo "    Dev server is ready."

# ── 3. Run e2e tests ────────────────────────────────────────────────
echo "==> Running e2e tests..."
START_TIME=$(date +%s)

set +e
bun run vitest run --config ./vitest.config.e2e.ts \
  --reporter=default --reporter=json \
  --outputFile.json="$JSON_OUTPUT" 2>&1 | tee "$RAW_OUTPUT"
TEST_EXIT_CODE=${PIPESTATUS[0]}
set -e

END_TIME=$(date +%s)
DURATION=$(( END_TIME - START_TIME ))

# ── 4. Generate detailed report from JSON output ────────────────────
mkdir -p "$REPORT_DIR"

if [ -s "$JSON_OUTPUT" ]; then
  bun "$SCRIPT_DIR/test/helpers/generate-report.ts" \
    "$JSON_OUTPUT" "$REPORT_FILE" "$DURATION"
else
  # Fallback: JSON wasn't produced (e.g. startup failure)
  if [ "$TEST_EXIT_CODE" -eq 0 ]; then STATUS="PASSED"; else STATUS="FAILED"; fi
  cat > "$REPORT_FILE" <<EOF
# E2E Test Report

| Field | Value |
|-------|-------|
| **Date** | $(date '+%Y-%m-%d %H:%M:%S') |
| **Status** | ${STATUS} |
| **Duration** | ${DURATION}s |

## Test Output

\`\`\`
$(cat "$RAW_OUTPUT")
\`\`\`
EOF
fi

# Print summary to console
if [ -s "$JSON_OUTPUT" ]; then
  STATUS=$(bun -e "
    const d = JSON.parse(require('fs').readFileSync('$JSON_OUTPUT','utf-8'));
    console.log(d.success ? 'PASSED' : 'FAILED');
  ")
  SUMMARY=$(bun -e "
    const d = JSON.parse(require('fs').readFileSync('$JSON_OUTPUT','utf-8'));
    console.log('Suites: ' + d.numPassedTestSuites + ' passed, ' + d.numFailedTestSuites + ' failed, ' + d.numTotalTestSuites + ' total');
    console.log('Tests:  ' + d.numPassedTests + ' passed, ' + d.numFailedTests + ' failed, ' + d.numTotalTests + ' total');
  ")
else
  if [ "$TEST_EXIT_CODE" -eq 0 ]; then STATUS="PASSED"; else STATUS="FAILED"; fi
  SUMMARY="(unable to parse results)"
fi

echo ""
echo "============================================"
echo "  E2E Status : ${STATUS}"
echo "  Duration   : ${DURATION}s"
echo "  ${SUMMARY}"
echo "  Report     : ${REPORT_FILE}"
echo "============================================"

exit "$TEST_EXIT_CODE"
