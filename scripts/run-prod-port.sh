#!/usr/bin/env bash
# Force production deskServer on $PORT (default 34344).
# Fixes the browser MIME error caused by serving /src/main.tsx as octet-stream.
set -euo pipefail

WEB_PORT="${PORT:-34344}"
APP_DIR="${APP_DIR:-$HOME/WAC_Quoto-Simulator}"
export NVM_DIR="${HOME}/.nvm"
export PORT="${WEB_PORT}"

cd "${APP_DIR}"
# shellcheck disable=SC1090
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"

echo "==> Stop anything on port ${WEB_PORT} (vite/dev/static/old desk)"
if [ -f "${HOME}/wac-desk-serve-${WEB_PORT}.pid" ]; then
  kill "$(cat "${HOME}/wac-desk-serve-${WEB_PORT}.pid")" 2>/dev/null || true
  rm -f "${HOME}/wac-desk-serve-${WEB_PORT}.pid"
fi
pkill -f "vite --port ${WEB_PORT}" 2>/dev/null || true
pkill -f "vite.*${WEB_PORT}" 2>/dev/null || true
pkill -f "node_modules/.bin/vite" 2>/dev/null || true
pkill -f "node_modules/.bin/serve" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${WEB_PORT}/tcp" 2>/dev/null || true
fi
sleep 1

echo "==> Build production dist/"
npm ci
npm run build
test -f dist/index.html
if grep -q '/src/main.tsx' dist/index.html; then
  echo "ERROR: dist/index.html still points at /src/main.tsx"
  exit 1
fi
grep -q '/assets/' dist/index.html

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

echo "==> Verify"
curl -sf "http://127.0.0.1:${WEB_PORT}/api/health"
echo
HTML="$(curl -sf "http://127.0.0.1:${WEB_PORT}/")"
echo "$HTML" | head -c 220
echo
if echo "$HTML" | grep -q '/src/main.tsx'; then
  echo "ERROR: still serving Vite DEV index on localhost:${WEB_PORT}"
  exit 1
fi
ASSET="$(echo "$HTML" | sed -n 's/.*src="\([^"]*\)".*/\1/p' | head -1)"
CTYPE="$(curl -sI "http://127.0.0.1:${WEB_PORT}${ASSET}" | tr -d '\r' | grep -i '^Content-Type:' || true)"
echo "Asset: ${ASSET}"
echo "${CTYPE}"
if ! echo "${CTYPE}" | grep -qi 'javascript'; then
  echo "ERROR: JS asset Content-Type must be javascript (got: ${CTYPE})"
  exit 1
fi

echo
echo "OK on localhost. Open:"
echo "  http://127.0.0.1:${WEB_PORT}/"
echo "  http://127.0.0.1:${WEB_PORT}/origin-cost-desk"
echo
echo "If http://devops.wactracking.com:${WEB_PORT}/ still shows MIME /src/main.tsx errors,"
echo "public ${WEB_PORT} is NOT this process — ask Teddy to point that URL at this container."
