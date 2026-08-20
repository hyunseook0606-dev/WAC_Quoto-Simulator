# WAC Origin Cost Desk

Internal air quotation desk. App routes everything to `/origin-cost-desk`.

## Local

```bash
npm ci
npm run dev
```

Port **5174**. Open `/origin-cost-desk`.

## Layout

- `src/origin-cost-desk/` — UI, quote engine, PDF HTML
- `public/excel/WAC_Air_Quotation_Simulator.xlsx` — Master rates source
- HKD lanes: TOTAL × Ex.Rate. USD lanes leave TOTAL as-is.
- Pin repeat cases in Input; Save PDF auto-saves history in localStorage.
- Master routes and weight breaks are editable; saved per browser (`origin-cost-desk.master.v2`). Bundled workbook is first-load default only.

## Cursor Cloud specific instructions

- `.cursor/environment.json` runs `npm ci`.
- Preview: `npm run dev -- --host 0.0.0.0 --port 5174`
- Typecheck: `npx tsc -b`
- Verify: `npm run verify:cases`
- Do not commit `.env` or Excel lock files (`~$*`).
- Logos: `public/wac-logo.png`, `public/wac-mark-hero.png`.
