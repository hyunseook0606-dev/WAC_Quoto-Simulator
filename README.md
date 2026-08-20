# WAC Origin Cost Desk

Internal air **가견적** desk. It mirrors the Excel workbook `Master_DB` → `입력` → `견적서`.

This is not the public marketing site. The only UI is `/origin-cost-desk`.

## Run

```bash
npm ci
npm run dev
```

Open http://localhost:5174/origin-cost-desk (Vite uses port **5174**).

```bash
npm run build    # production static files in dist/
npx tsc -b       # typecheck
```

Node 22+ recommended.

## Daily workflow

1. **Master_DB** — yellow cells are live rates (edit routes, breaks, locals by hand). **First visit** loads bundled Excel; **after that** this browser keeps your edits automatically (local and cloud).
2. **Input** — cargo, route, 비용 내역. Local charge **names** come from Master. Edit **unit** and **참고** by hand. **예외(J)** overrides 참고.
3. Repeat cases: **Pin this case** once (e.g. Chocolate KEEP COOL). Next time click it at the top of Input, change only cargo / 예외 / remark, then Save PDF.
4. **Save PDF** also writes history in this browser (`localStorage`). Same case is upserted, not duplicated.
5. **Reuse** = new draft. **Open** = reprint the saved quote.

### Calculation rules (must match Excel)

- CBM = L × W × H × Qty / 1,000,000
- Volume kg = CBM × 167
- C.W. = max(gross, volume kg)
- Break: highest Master weight-break whose min kg ≤ C.W. Default GCR is -45 / +45 / +100 / +500 / +1000; add +300, +2000, or FLAT in Master if the contract needs it
- Air freight = max(rate × C.W., MIN); FSC/SSC = per kg × C.W.
- Local: CBM / KG|C.W. / BL|ENTRY / PLT / else max(rate, min)
- Currency from Master `CUR`. If **HKD**, TOTAL × Ex.Rate. If **USD**, Ex.Rate is ignored.
- PDF hides zero-amount lines and empty extra Other rows.

Excel file the UI loads:

`public/excel/WAC_Air_Quotation_Simulator.xlsx`

## Layout

```
src/origin-cost-desk/
  OriginCostDeskSite.tsx   UI: Master / Input / Quotation / history
  cmExcelMaster.ts         parse Master_DB from xlsx
  cmDeskQuote.ts           quote math
  cmDeskDocument.ts        quotation HTML
  cmDeskPdf.ts             which lines print
  cmMasterEdit.ts          patch air/local rows
  cmDeskConfig.ts          extra Other row type
  components/CmMasterEditor.tsx
src/quoteDocument.ts       browser print (no localhost footer)
excel-quote/               optional Python engine (sanity / future API)
.cursor/                   Cursor Cloud Agent environment (optional)
```

History and the current draft live in **browser localStorage only**. They are not on the server and not shared across PCs.

## Verification (ICN-HKG)

After changing Master or quote logic, run:

```bash
npm run verify:cases
```

| Case | Input | Expect |
|------|-------|--------|
| **A** Volume | 110×110×150 cm × 3 PLT, GW 400 kg | C.W. ≈ 909 kg (+500 @ $3.20) |
| **B** Heavy | 30×30×30 cm × 1, GW 80 kg | C.W. = 80 kg (+45 @ $4.50) |
| **C** MIN | 20×20×20 cm × 1, GW 3 kg | Air ≥ $50 MIN, Trucking ≥ $80 MIN |

Route: **ICN-HKG** (USD). Script: `scripts/verify-icn-hkg-cases.mts`.

## Deploy (static)

```bash
npm ci
npm run build
```

Serve the `dist/` folder with any static host (nginx, etc.). Client-side routing: all paths should fallback to `index.html`.

Do **not** commit SSH passwords or intern accounts. Keep server credentials in the host vault, not this repo.

## What not to add back

Marketing pages, pitch PNGs, and unused public photos were removed on purpose. The desk only needs WAC logos + the Excel workbook under `public/`.
