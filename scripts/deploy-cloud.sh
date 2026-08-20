#!/usr/bin/env bash
# Run on the devops host after SSH login.
# Requires: git. Installs Node via nvm in $HOME if missing (no sudo).
# Serves UI + shared history API via server/deskServer.mjs
#
# Optional env:
#   PORT=8080
#   APP_DIR=~/WAC_Quoto-Simulator
#   REPO=https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator.git
set -euo pipefail

APP_DIR="${APP_DIR:-${HOME}/WAC_Quoto-Simulator}"
REPO="${REPO:-https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator.git}"
WEB_PORT="${PORT:-8080}"
export NVM_DIR="${HOME}/.nvm"
export PORT="${WEB_PORT}"

echo "==> Deploy Origin Cost Desk to ${APP_DIR} (port ${WEB_PORT})"

if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing nvm + Node 22 (user-local)"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
  nvm install 22
  nvm alias default 22
fi

# shellcheck disable=SC1090
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"

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
npm ci
npm run build
npm run verify:cases
mkdir -p "${APP_DIR}/data"

# Stop old static serve / desk server
pkill -f "serve -s dist" 2>/dev/null || true
pkill -f "server/deskServer.mjs" 2>/dev/null || true
sleep 1

nohup bash -c '
  export NVM_DIR="$HOME/.nvm"
  . "$NVM_DIR/nvm.sh"
  export PORT='"${WEB_PORT}"'
  cd "'"${APP_DIR}"'"
  while true; do
    node server/deskServer.mjs >> "$HOME/wac-desk-serve.log" 2>&1
    echo "$(date) deskServer exited, restarting..." >> "$HOME/wac-desk-serve.log"
    sleep 2
  done
' >/dev/null 2>&1 &
echo $! > "${HOME}/wac-desk-serve.pid"
sleep 2

echo "==> Serving UI + shared history API on 0.0.0.0:${WEB_PORT}"
echo "    On host:  http://127.0.0.1:${WEB_PORT}/origin-cost-desk"
echo "    History:  http://127.0.0.1:${WEB_PORT}/api/history"
echo "    Store:    ${APP_DIR}/data/shared-history.json"
echo "    If the public port is closed, SSH-tunnel ${WEB_PORT} to your laptop and open localhost."
echo "    Master rates remain per-browser (localStorage)."
