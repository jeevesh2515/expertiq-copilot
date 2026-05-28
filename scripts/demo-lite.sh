#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

timestamp_ms() {
  python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="$2"
  local start elapsed
  start="$(timestamp_ms)"
  while true; do
    if curl -sS --max-time 2 "$url" >/dev/null 2>&1; then
      elapsed="$(( $(timestamp_ms) - start ))"
      echo "$elapsed"
      return 0
    fi
    if (( $(timestamp_ms) - start > timeout_seconds * 1000 )); then
      return 1
    fi
    sleep 0.3
  done
}

echo "Starting ExpertIQ demo-lite profile..."
echo "  Backend: http://127.0.0.1:${BACKEND_PORT}"
echo "  Frontend: http://127.0.0.1:${FRONTEND_PORT}"
echo "  Frontend mode: production (no file watchers)"

START_ALL="$(timestamp_ms)"

if [ ! -f "$FRONTEND_DIR/.next/BUILD_ID" ]; then
  echo "Preparing frontend production bundle..."
  (
    cd "$FRONTEND_DIR"
    npm run build >/dev/null
  )
fi

(
  cd "$BACKEND_DIR"
  PREWARM_LIGHTWEIGHT_INDEX=false ENABLE_KNOWLEDGE_GRAPH=false \
    venv/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

(
  cd "$FRONTEND_DIR"
  npm run start
) &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "Stopping demo-lite services..."
  kill "$BACKEND_PID" "$FRONTEND_PID" >/dev/null 2>&1 || true
}
trap cleanup INT TERM EXIT

BACKEND_MS="$(wait_for_url "http://127.0.0.1:${BACKEND_PORT}/api/health" 60)" || {
  echo "Backend failed to become healthy within timeout."
  exit 1
}

FRONTEND_MS="$(wait_for_url "http://127.0.0.1:${FRONTEND_PORT}" 90)" || {
  echo "Frontend failed to become ready within timeout."
  exit 1
}

TOTAL_MS="$(( $(timestamp_ms) - START_ALL ))"
echo ""
echo "Demo-lite startup timings:"
echo "  Backend healthy: ${BACKEND_MS} ms"
echo "  Frontend ready:  ${FRONTEND_MS} ms"
echo "  Total ready:     ${TOTAL_MS} ms"
echo ""
echo "Demo-lite is running. Press Ctrl+C to stop."

wait
