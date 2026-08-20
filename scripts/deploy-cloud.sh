#!/usr/bin/env bash
# Run on devops host after SSH login.
set -euo pipefail

APP_DIR="${HOME}/WAC_Quoto-Simulator"
REPO="https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator.git"
PORT="${PORT:-8080}"

echo "==> Deploy Origin Cost Desk to ${APP_DIR} (port ${PORT})"

if [ -d "${APP_DIR}/.git" ]; then
  cd "${APP_DIR}"
  git fetch origin main
  git reset --hard origin/main
else
  rm -rf "${APP_DIR}"
  git clone "${REPO}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

npm ci
npm run build
npm run verify:cases

echo "==> Built dist/. Serve with:"
echo "    npx serve -s dist -l ${PORT}"
echo "    Open: http://<host>:${PORT}/origin-cost-desk"
echo ""
echo "Master edits in the browser are saved per user (localStorage), not in this repo."
