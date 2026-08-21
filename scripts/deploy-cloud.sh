#!/usr/bin/env bash
# Run on the devops host after SSH login, or from GitHub Actions over SSH.
# Requires: git. Installs Node via nvm in $HOME if missing (no sudo).
# Serves UI + shared history API via server/deskServer.mjs
#
# Optional env:
#   PORT=34344          # public desk port (Teddy test env). Default 8080.
#   APP_DIR=~/WAC_Quoto-Simulator
#   REPO=https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator.git
#
# After git reset, this script re-execs itself so the rest of the steps
# always match origin/main (avoids running a stale in-memory script body).
set -euo pipefail

APP_DIR="${APP_DIR:-${HOME}/WAC_Quoto-Simulator}"
REPO="${REPO:-https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator.git}"
WEB_PORT="${PORT:-8080}"
PID_FILE="${HOME}/wac-desk-serve-${WEB_PORT}.pid"
LOG_FILE="${HOME}/wac-desk-serve-${WEB_PORT}.log"
export NVM_DIR="${HOME}/.nvm"
export PORT="${WEB_PORT}"
export APP_DIR REPO

load_nvm() {
  if [ -s "${NVM_DIR}/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "${NVM_DIR}/nvm.sh"
  fi
}

ensure_node() {
  load_nvm
  if command -v node >/dev/null 2>&1; then
    return 0
  fi
  echo "==> Installing nvm + Node 22 (user-local)"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  load_nvm
  nvm install 22
  nvm alias default 22
}

sync_repo() {
  echo "==> Deploy Origin Cost Desk to ${APP_DIR} (port ${WEB_PORT})"
  if [ -d "${APP_DIR}/.git" ]; then
    cd "${APP_DIR}"
    git fetch origin main
    git reset --hard origin/main
  else
    rm -rf "${APP_DIR}"
    git clone "${REPO}" "${APP_DIR}"
    cd "${APP_DIR}"
  fi
  git log -1 --oneline
}

stop_old_server() {
  # Only stop the instance for this PORT (do not kill other ports).
  if [ -f "${PID_FILE}" ]; then
    kill "$(cat "${PID_FILE}")" 2>/dev/null || true
    rm -f "${PID_FILE}"
  fi
  # Legacy single pid file (older deploys on 8080)
  if [ "${WEB_PORT}" = "8080" ] && [ -f "${HOME}/wac-desk-serve.pid" ]; then
    kill "$(cat "${HOME}/wac-desk-serve.pid")" 2>/dev/null || true
    rm -f "${HOME}/wac-desk-serve.pid"
  fi
  # Vite/dev servers cause /src/main.tsx + octet-stream MIME errors in the browser
  pkill -f "vite --port ${WEB_PORT}" 2>/dev/null || true
  pkill -f "node_modules/.bin/vite" 2>/dev/null || true
  pkill -f "node_modules/.bin/serve" 2>/dev/null || true
  pkill -f "serve -s dist" 2>/dev/null || true
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${WEB_PORT}/tcp" 2>/dev/null || true
  fi
  sleep 2
}

start_desk_server() {
  nohup bash -c '
    export NVM_DIR="$HOME/.nvm"
    . "$NVM_DIR/nvm.sh"
    export PORT='"${WEB_PORT}"'
    cd "'"${APP_DIR}"'"
    while true; do
      node server/deskServer.mjs >> "'"${LOG_FILE}"'" 2>&1
      echo "$(date) deskServer exited, restarting..." >> "'"${LOG_FILE}"'"
      sleep 2
    done
  ' >/dev/null 2>&1 &
  echo $! > "${PID_FILE}"
  sleep 2
}

build_and_serve() {
  ensure_node
  cd "${APP_DIR}"
  npm ci
  npm run build
  npm run verify:cases
  mkdir -p "${APP_DIR}/data"
  # So static frontends bound to the repo root do not serve /src/main.tsx
  bash "${APP_DIR}/scripts/publish-dist-root.sh" "${APP_DIR}"
  stop_old_server
  start_desk_server
  echo "==> Serving UI + shared history API on 0.0.0.0:${WEB_PORT}"
  echo "    Public (if open): http://devops.wactracking.com:${WEB_PORT}/"
  echo "    On host:          http://127.0.0.1:${WEB_PORT}/"
  echo "    History:          http://127.0.0.1:${WEB_PORT}/api/history"
  echo "    Store:            ${APP_DIR}/data/shared-history.json"
  echo "    Master rates remain per-browser (localStorage)."
}

if [ "${1:-}" = "--continue" ]; then
  build_and_serve
  exit 0
fi

sync_repo
# Re-exec the script from disk so steps after reset match HEAD.
exec bash "${APP_DIR}/scripts/deploy-cloud.sh" --continue
