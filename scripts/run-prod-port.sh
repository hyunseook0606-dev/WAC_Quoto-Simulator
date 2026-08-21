#!/usr/bin/env bash
# Force production files + deskServer on $PORT (default 34344).
# Fixes browser MIME error from /src/main.tsx → application/octet-stream.
set -euo pipefail

WEB_PORT="${PORT:-34344}"
APP_DIR="${APP_DIR:-$HOME/WAC_Quoto-Simulator}"
export NVM_DIR="${HOME}/.nvm"
export PORT="${WEB_PORT}"

cd "${APP_DIR}"
# shellcheck disable=SC1090
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"

echo "==> Sync repo"
git fetch origin main
git reset --hard origin/main

echo "==> Stop anything on port ${WEB_PORT}"
if [ -f "${HOME}/wac-desk-serve-${WEB_PORT}.pid" ]; then
  kill "$(cat "${HOME}/wac-desk-serve-${WEB_PORT}.pid")" 2>/dev/null || true
  rm -f "${HOME}/wac-desk-serve-${WEB_PORT}.pid"
fi
pkill -f "vite --port ${WEB_PORT}" 2>/dev/null || true
pkill -f "node_modules/.bin/vite" 2>/dev/null || true
pkill -f "node_modules/.bin/serve" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${WEB_PORT}/tcp" 2>/dev/null || true
fi
sleep 1

echo "==> Build"
npm ci
npm run build
bash "${APP_DIR}/scripts/publish-dist-root.sh" "${APP_DIR}"

echo "==> Start deskServer on ${WEB_PORT}"
mkdir -p data
nohup bash -c "
  export NVM_DIR=\"\$HOME/.nvm\"
  . \"\$NVM_DIR/nvm.sh\"
  export PORT=${WEB_PORT}
  cd \"${APP_DIR}\"
  while true; do
    node server/deskServer.mjs >> \"\$HOME/wac-desk-serve-${WEB_PORT}.log\" 2>&1
    echo \"\$(date) deskServer exited, restarting...\" >> \"\$HOME/wac-desk-serve-${WEB_PORT}.log\"
    sleep 2
  done
" >/dev/null 2>&1 &
echo $! > "${HOME}/wac-desk-serve-${WEB_PORT}.pid"
sleep 2

echo "==> Verify localhost"
curl -sf "http://127.0.0.1:${WEB_PORT}/api/health"; echo
HTML="$(curl -sf "http://127.0.0.1:${WEB_PORT}/" || true)"
if echo "$HTML" | grep -q '/src/main.tsx'; then
  echo "ERROR: localhost still serves DEV index"
  exit 1
fi
echo "$HTML" | grep -o 'src="[^"]*"' | head -3
ASSET="$(echo "$HTML" | sed -n 's/.*src="\([^"]*\)".*/\1/p' | head -1)"
echo "Asset Content-Type:"
curl -sI "http://127.0.0.1:${WEB_PORT}${ASSET}" | tr -d '\r' | grep -i '^Content-Type:' || true

echo
echo "Also verify published root index (for static hosts):"
grep -o 'src="[^"]*"' "${APP_DIR}/index.html" | head -3
if grep -q '/src/main.tsx' "${APP_DIR}/index.html"; then
  echo "ERROR: published index.html still has /src/main.tsx"
  exit 1
fi

echo
echo "OK. Try: http://devops.wactracking.com:${WEB_PORT}/"
echo "Hard-refresh the browser (Ctrl+Shift+R)."
