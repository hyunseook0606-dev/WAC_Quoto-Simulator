#!/usr/bin/env bash
# Run on devops host after SSH login (or via CI).
# Requires: git. Installs Node via nvm in $HOME if missing (no sudo).
set -euo pipefail

APP_DIR="${HOME}/WAC_Quoto-Simulator"
REPO="https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator.git"
WEB_PORT="${PORT:-8080}"
export NVM_DIR="${HOME}/.nvm"

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
npm install --no-save serve@14

pkill -f "serve -s dist -l ${WEB_PORT}" 2>/dev/null || true
pkill -f "serve -s dist -l tcp://0.0.0.0:${WEB_PORT}" 2>/dev/null || true
sleep 1
nohup ./node_modules/.bin/serve -s dist -l "tcp://0.0.0.0:${WEB_PORT}" \
  > "${HOME}/wac-desk-serve.log" 2>&1 &
echo $! > "${HOME}/wac-desk-serve.pid"
sleep 1

echo "==> Serving dist/ on 0.0.0.0:${WEB_PORT}"
echo "    Local on server: http://127.0.0.1:${WEB_PORT}/origin-cost-desk"
echo "    If public port is closed, SSH tunnel from your PC:"
echo "      ssh -p 34343 -L ${WEB_PORT}:127.0.0.1:${WEB_PORT} userinternship@devops.wactracking.com"
echo "      then open http://localhost:${WEB_PORT}/origin-cost-desk"
echo ""
echo "Master edits stay in each browser (localStorage), not on this server."
