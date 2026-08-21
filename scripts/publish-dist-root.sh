#!/usr/bin/env bash
# Copy production dist/ into the app root so hosts that statically
# serve the repo (instead of deskServer) do not load /src/main.tsx
# as application/octet-stream.
set -euo pipefail

APP_DIR="${1:-${APP_DIR:-$PWD}}"
DIST="${APP_DIR}/dist"

if [ ! -f "${DIST}/index.html" ]; then
  echo "ERROR: ${DIST}/index.html missing — run npm run build first"
  exit 1
fi

if grep -q '/src/main.tsx' "${DIST}/index.html"; then
  echo "ERROR: dist/index.html still references /src/main.tsx"
  exit 1
fi

echo "==> Publish dist/ → ${APP_DIR} (index.html + assets/)"
rm -rf "${APP_DIR}/assets"
cp -a "${DIST}/assets" "${APP_DIR}/assets"
cp -f "${DIST}/index.html" "${APP_DIR}/index.html"

# Vite also emits public/ files into dist root (favicons, excel, logos)
for f in "${DIST}"/*; do
  base="$(basename "$f")"
  if [ "$base" = "assets" ] || [ "$base" = "index.html" ]; then
    continue
  fi
  if [ -f "$f" ]; then
    cp -f "$f" "${APP_DIR}/${base}"
  elif [ -d "$f" ]; then
    rm -rf "${APP_DIR}/${base}"
    cp -a "$f" "${APP_DIR}/${base}"
  fi
done

# SPA fallback for simple static hosts that look for 404.html
cp -f "${DIST}/index.html" "${APP_DIR}/404.html"

echo "Published. Root index must reference /assets/*.js (not /src/main.tsx)."
grep -o 'src="[^"]*"' "${APP_DIR}/index.html" | head -3
