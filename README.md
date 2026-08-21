# WAC Origin Cost Desk

Internal **air origin-cost quotation (가견적)** desk for WAC forwarding.

It mirrors the Excel workbook flow:

**Master_DB → Input → Quotation (PDF)**

| | |
|--|--|
| **App URL path** | `/` or `/origin-cost-desk` |
| **Stack** | React 19 + Vite + TypeScript |
| **Production server** | `server/deskServer.mjs` (static `dist/` + history API) |
| **Repo** | [hyunseook0606-dev/WAC_Quoto-Simulator](https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator) |

This is an internship MVP. Quote math must stay aligned with the bundled Excel rates file.

---

## Quick start (local)

```bash
npm ci
npm run dev
```

Open: http://localhost:5174/origin-cost-desk

**Optional — shared history while developing** (two terminals):

```bash
npm run dev:api   # history API on :8080
npm run dev       # Vite proxies /api → :8080
```

Without `dev:api`, history falls back to this browser only (`localStorage`).

```bash
npx tsc -b
npm run verify:cases
npm run build
```

Node **22+** recommended.

---

## What is shared vs per-browser

| Data | Storage |
|------|---------|
| Quote history (Save PDF, Pin, delete) | Server `data/shared-history.json` when `/api/history` is available; otherwise browser `localStorage` |
| Master rates & input draft | Browser `localStorage` only |
| Bundled Excel | First-load default only (`public/excel/…`) |

For **team-shared history**, the site must be served by `deskServer` (so `/api/health` and `/api/history` respond). A static file host with UI only will not share history across PCs.

---

## Production

```bash
npm ci
npm run build
npm start          # PORT=8080 by default
# PORT=34344 npm start
```

| Endpoint | Purpose |
|----------|---------|
| `/`, `/origin-cost-desk` | Desk UI |
| `GET /api/health` | Liveness |
| `GET/POST /api/history` | List / upsert history |
| `DELETE /api/history/:id` | Delete one item |

---

## Deploy (company devops)

1. Prefer **GitHub Actions** (workflow: `.github/workflows/deploy.yml`).
2. Put SSH settings only in **GitHub Actions secrets** (never in source):
   - `DEPLOY_HOST`, `DEPLOY_SSH_PORT`, `DEPLOY_USER`
   - `DEPLOY_SSH_KEY` (preferred) or `DEPLOY_PASSWORD`
3. On the host, the deploy script builds, publishes `dist/` for static frontends, and starts `deskServer` on port **34344**.

Manual on the host:

```bash
PORT=34344 bash scripts/deploy-cloud.sh
```

Security rules for this environment: **[SECURITY.md](./SECURITY.md)**.

---

## Repository layout

```
src/origin-cost-desk/     Desk UI, quote engine, PDF HTML, history client
server/deskServer.mjs     Production static + /api/history
public/excel/             Master rates workbook (web default)
scripts/
  verify-icn-hkg-cases.mts   Quote regression (A–F)
  deploy-cloud.sh            Host deploy (git pull → build → deskServer)
  publish-dist-root.sh       Copy dist/ into web root (static hosts)
  run-prod-port.sh           One-shot prod restart helper
excel-quote/              Optional Python engine (not used by the web app)
.github/workflows/        CI deploy (secrets only — no passwords in git)
```

---

## Quote rules (must match Excel)

- CBM = L × W × H × Qty / 1,000,000  
- Volume kg = CBM × 167  
- Per-piece C.W. = max(GW, CBM×167); multi-piece = sum (Excel M14)  
- Break = highest Master weight-break with min kg ≤ C.W.  
- Air = max(rate × C.W., MIN); FSC/SSC = per kg × C.W.  
- ALL-IN /kg (display only) = Air rate + FSC/kg + SSC/kg  
- **HKD** TOTAL × Ex.Rate; **USD** ignores Ex.Rate  

After changing quote or Master parsing: `npm run verify:cases`.

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `dev` | Vite (:5174) |
| `dev:api` | Local history API (:8080) |
| `build` | Typecheck + production bundle |
| `start` | `deskServer` |
| `verify:cases` | Regression cases |

---

## Notes

- No marketing site in this repo — desk only.  
- Do not commit `.env`, private keys, or Excel lock files (`~$*`).  
- Optional Cursor Cloud files are **not** part of the product runtime; see `SECURITY.md` before any server access.
