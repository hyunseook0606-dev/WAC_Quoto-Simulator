# WAC Origin Cost Desk (Internal Excel-style Quote)

This repository contains the **internal** “Origin Cost Desk” web app:

- Route: `http://localhost:5174/origin-cost-desk`
- Excel-style workflow: edit `Master_DB` → enter cargo → generate quotation + copyable table + save PDF

Public quote / marketing site code was intentionally removed from this repo to keep onboarding simple.

## Run locally (development)

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:5174/origin-cost-desk`

## Key folders

- `src/origin-cost-desk/`
  - `OriginCostDeskSite.tsx`: main internal UI (Master DB, Input, Quotation, History)
  - `cmExcelMaster.ts`: parse Master_DB from the Excel simulator workbook
  - `cmDeskQuote.ts`: desk calculation (C.W., lines, Other/Exception behavior)
  - `cmDeskDocument.ts`: quotation HTML/text builders
  - `cmDeskPdf.ts`: which lines are visible on PDF (Other hiding rule)
  - `components/`: `CmMasterEditor`, `CmDeskQuotePanel`
- `src/quoteDocument.ts`
  - shared browser print helper used by the desk PDF flow

## Excel source file

The desk UI loads the Excel simulator workbook from:

- `public/excel/WAC_Air_Quotation_Simulator.xlsx`

You can also download/import the same file from the UI to edit `Master_DB`.

## About cloud/API (optional)

There is an Excel-backed Python engine candidate under `excel-quote/` for future cloud API work.
The current UI works fully on the client (Master parsing + calculation) for instant UX.

