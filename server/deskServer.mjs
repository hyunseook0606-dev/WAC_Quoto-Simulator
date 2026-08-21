/**
 * Origin Cost Desk — production static server + shared history API.
 *
 *   npm start
 *   PORT=8080 node server/deskServer.mjs
 *
 * Store: data/shared-history.json (gitignored, created on first run)
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const DATA_DIR = path.join(ROOT, 'data')
const HISTORY_FILE = path.join(DATA_DIR, 'shared-history.json')
const PORT = Number(process.env.PORT || 8080)
const MAX_ITEMS = 500

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({ updatedAt: null, items: [] }, null, 2))
  }
}

function readStore() {
  ensureStore()
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : []
    return { updatedAt: parsed?.updatedAt ?? null, items }
  } catch {
    return { updatedAt: null, items: [] }
  }
}

function writeStore(items) {
  ensureStore()
  const trimmed = items.slice(0, MAX_ITEMS)
  const payload = {
    updatedAt: new Date().toISOString(),
    items: trimmed,
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(payload, null, 2))
  return payload
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(data)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    const limit = 8 * 1024 * 1024
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.cjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.map': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      // Never treat TS sources as browser modules in production.
      '.ts': 'text/plain; charset=utf-8',
      '.tsx': 'text/plain; charset=utf-8',
    }[ext] || 'application/octet-stream'
  )
}

function serveStatic(req, res, urlPath) {
  if (!fs.existsSync(DIST)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('dist/ missing — run npm run build (API still works at /api/*)')
    return
  }
  let rel = decodeURIComponent(urlPath.split('?')[0])
  // Block Vite source entry — production must use dist/assets/*.js
  if (rel.startsWith('/src/')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Source files are not served in production. Use npm run build + deskServer.')
    return
  }
  if (rel === '/' || rel === '') rel = '/index.html'
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '')
  let filePath = path.join(DIST, safe)
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden')
    return
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback
    filePath = path.join(DIST, 'index.html')
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404).end('Not found')
    return
  }
  const type = contentType(filePath)
  res.writeHead(200, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
  })
  fs.createReadStream(filePath).pipe(res)
}

async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, service: 'origin-cost-desk', sharedHistory: true })
    return
  }

  if (pathname === '/api/history' && req.method === 'GET') {
    const store = readStore()
    sendJson(res, 200, store)
    return
  }

  if (pathname === '/api/history' && (req.method === 'POST' || req.method === 'PUT')) {
    const raw = await readBody(req)
    const item = JSON.parse(raw || '{}')
    if (!item?.id || typeof item.id !== 'string') {
      sendJson(res, 400, { error: 'id required' })
      return
    }
    const store = readStore()
    const idx = store.items.findIndex((row) => row.id === item.id)
    const next = [...store.items]
    if (idx >= 0) next[idx] = item
    else next.unshift(item)
    // newest first
    next.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    const saved = writeStore(next)
    sendJson(res, 200, { ok: true, item, updatedAt: saved.updatedAt, count: saved.items.length })
    return
  }

  const del = pathname.match(/^\/api\/history\/([^/]+)$/)
  if (del && req.method === 'DELETE') {
    const id = decodeURIComponent(del[1])
    const store = readStore()
    const next = store.items.filter((row) => row.id !== id)
    const saved = writeStore(next)
    sendJson(res, 200, { ok: true, id, count: saved.items.length })
    return
  }

  sendJson(res, 404, { error: 'Not found' })
}

ensureStore()

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${PORT}`
    const url = new URL(req.url || '/', `http://${host}`)
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname)
      return
    }
    serveStatic(req, res, url.pathname)
  } catch (err) {
    console.error(err)
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Server error' })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Origin Cost Desk listening on http://0.0.0.0:${PORT}`)
  console.log(`  UI:      /origin-cost-desk`)
  console.log(`  History: /api/history`)
  console.log(`  Store:   ${HISTORY_FILE}`)
})
