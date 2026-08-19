# WAC Logistics — Digital Freight Desk

Portfolio MVP: corporate logistics site + **air Instant Quote** (Public) + internal **Origin Cost Desk**.

**Live:** [https://wac-logistics.vercel.app](https://wac-logistics.vercel.app)  
**Repo:** [hyunseook0606-dev/WAC-Logistics](https://github.com/hyunseook0606-dev/WAC-Logistics)

---

## Problem

Freight desks still quote many lanes with **Excel + email**. Even with air-rate tools, **Hong Kong origin local / trucking fees** (cartage, tunnel, parking) change per job and do not sit cleanly on a monthly master — so staff re-enter and re-match the same shipment data.

## What this MVP proves

1. **Split the workflow** — shippers see indicative air only; desk owns formal origin cost.  
2. **Split the cost model** — monthly Excel-style master auto-calcs; job-variable fees are explicit slots.  
3. **Ground it in real docs** — `cost item_origin.xlsx` + sample `INV_AE260703101` (see metrics below).  
4. **Make output pasteable** — Public email draft vs Desk HTML cost sheet for Outlook / Excel.

It is **not** a claim that custom software replaces ops judgment, margin control, or quote→INV SOP.

---

## Validation (numbers)

Sample INV non-air lines (**7**): Handling, CFS, Terminal, Document, Cartage, Tunnel, Parking.

| Result | Share | Detail |
|--------|------:|--------|
| Exact master match | **2/7 (29%)** | Terminal Flat×C.W., Document Min |
| Same formula, different amount | **2/7 (29%)** | Handling (Excel 150 vs INV **312**), CFS Min path |
| Missing from Excel master | **3/7 (43%)** | Cartage / Tunnel / Parking → Desk slots |

Full line table, formula, and limits: [`docs/검증-메트릭.md`](./docs/검증-메트릭.md)

---

## Two modes

| Mode | Who | What |
|------|-----|------|
| **Public Quote** | Shipper / nominee | Lane + dims + weight → C.W. + indicative air (USD) → Request Quote / **Copy Email Draft** |
| **WAC Desk** | Internal | Same cargo + auto local master + Cartage/Tunnel/Parking slots + FX → Formal HKD/USD + **Copy Cost Sheet** |

Local per-kg lines: `max(Min, Flat × C.W.)`.  
C.W.: `max(gross, L×W×H / 6000)`.

---

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Lucide · Vercel

```
src/
  App.tsx              # Quote / Desk UI + routes
  pages/HomePage.tsx   # Landing
  pages/TrackPage.tsx  # AWB demo (not live airline API)
  originCost.ts        # EXP local master + variable-slot engine
  quoteDocument.ts     # Desk PDF / print HTML
  fx.ts                # USD→HKD (Frankfurter + fallback 7.8)
docs/
  검증-메트릭.md
  주간보고-Public-vs-Desk.md
  변동비-고정비-UI방향.md
  보고서-캡처/
```

---

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

---

## Honest limits

- Air rates are **mock** (no CargoAI / internal rate DB wired).  
- Master amounts follow one monthly Excel pattern; slots default from one INV.  
- Handling mismatch is documented on purpose — full auto-calc would hide real ops variance.  
- CM internship deliverable is the **Excel simulator** (`excel-quote/`). Web Desk can import the same Master_DB for portfolio demo only.

---

## Docs

| Doc | Purpose |
|-----|---------|
| [검증-메트릭.md](./docs/검증-메트릭.md) | Line matching + portfolio metrics |
| [주간보고-Public-vs-Desk.md](./docs/주간보고-Public-vs-Desk.md) | Public vs Desk + ops questions |
| [변동비-고정비-UI방향.md](./docs/변동비-고정비-UI방향.md) | Fixed vs variable cost framing |
| [보고서-캡처/](./docs/보고서-캡처/) | Screenshots for demos / reports |

---

## Author

Internship / portfolio piece around WAC-style air quote workflows.  
Built by Hyunseo Ok.
