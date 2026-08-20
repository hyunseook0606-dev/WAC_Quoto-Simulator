# WAC Origin Cost Desk

Internal air **가견적** tool for WAC forwarding. It mirrors the Excel workbook flow:

`Master_DB` → `입력` → `견적서` (PDF)

Only route in the app: `/origin-cost-desk`.

Repo: [hyunseook0606-dev/WAC_Quoto-Simulator](https://github.com/hyunseook0606-dev/WAC_Quoto-Simulator)

## What this is

- React + Vite desk UI that loads rates from `public/excel/WAC_Air_Quotation_Simulator.xlsx` (first visit), then keeps Master edits in **browser localStorage**.
- Quote math lives in TypeScript (`cmDeskQuote.ts`) and must stay aligned with Excel.
- Production process (`npm start`) serves the built UI **and** a small JSON history API so the team shares Save PDF / Pin history on one server file.

## Requirements

- Node **22+** (nvm on the devops host is fine)
- npm

## Local development

```bash
npm ci
npm run dev          # http://localhost:5174/origin-cost-desk
```

### Shared history while developing

History API runs separately; Vite proxies `/api` → `127.0.0.1:8080`.

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev
```

If `dev:api` is down, the UI uses browser-only history and shows that in the history panel.

### Checks

```bash
npx tsc -b
npm run verify:cases   # ICN-HKG / HKG-ICN regression cases A–F
npm run build
```

## Production (UI + shared history)

```bash
npm ci
npm run build
npm start              # node server/deskServer.mjs  (PORT default 8080)
```

| Path | Purpose |
|------|---------|
| `/origin-cost-desk` | Desk UI (SPA; unknown paths → `index.html`) |
| `GET /api/health` | Liveness |
| `GET /api/history` | `{ updatedAt, items }` |
| `POST /api/history` | Upsert one history item by `id` |
| `DELETE /api/history/:id` | Remove one item |

Store file (created at runtime, **not** in git):

`data/shared-history.json`

### What is shared vs local

| Data | Where |
|------|--------|
| Quote history (Save PDF, Pin, delete) | Server file when API is up; else localStorage fallback |
| Master rates / draft input | Per browser (`localStorage`) |
| Bundled Excel | First-load default only |

v1 history is last-write-wins, no auth (internal network / tunnel only).

## Deploy on company devops host

Helper: `scripts/deploy-cloud.sh` (run **on the host** after SSH).

It will:

1. `git fetch` + `reset --hard origin/main`
2. `npm ci` → `build` → `verify:cases`
3. Stop old `serve` / previous `deskServer`
4. Start `node server/deskServer.mjs` under a simple restart loop

```bash
bash scripts/deploy-cloud.sh
# or: PORT=8080 bash scripts/deploy-cloud.sh
```

If the public port is firewalled, open an SSH local tunnel from your PC, then use `http://localhost:8080/origin-cost-desk`.

Do **not** commit SSH passwords, keys, or host accounts into this repo.

## Layout

```
src/origin-cost-desk/     UI, quote engine, PDF HTML, history client
server/deskServer.mjs     Static dist/ + /api/history
public/excel/…xlsx        Master rates source for the web app
scripts/verify-icn-hkg-cases.mts
scripts/deploy-cloud.sh
excel-quote/              Optional Python engine (not used by the web UI)
data/                     Runtime shared history (gitignored)
```

## Calculation rules (must match Excel)

- CBM = L × W × H × Qty / 1,000,000
- Volume kg = CBM × 167
- Per-piece C.W. = max(GW, CBM×167); multi-piece C.W. = sum of per-piece (Excel M14)
- Break: highest Master weight-break whose min kg ≤ C.W.
- Air freight = max(rate × C.W., MIN); FSC/SSC = per kg × C.W.
- ALL-IN /kg (display) = Air rate + FSC/kg + SSC/kg (not part of TOTAL)
- Local: CBM / KG|C.W. / BL|ENTRY / PLT / else max(rate, min); Terminal basis can follow Master Note (C.W. vs G.W.)
- Currency from Master `CUR`. **HKD** → TOTAL × Ex.Rate. **USD** → Ex.Rate ignored.

## npm scripts

| Script | Role |
|--------|------|
| `dev` | Vite on 5174 |
| `dev:api` | History API (+ serves `dist/` if built) |
| `build` | `tsc -b` + Vite production build |
| `start` | Production desk server |
| `verify:cases` | Quote regression |

## Notes for maintainers

- Changing quote math or Master parsing: run `npm run verify:cases` before merge.
- Shared history JSON can grow (PDF HTML is stored per item); server body limit is 8MB per request.
- Marketing / pitch assets were removed on purpose; keep only WAC logos + the Excel under `public/`.
