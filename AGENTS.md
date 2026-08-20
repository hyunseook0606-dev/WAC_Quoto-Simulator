# WAC Origin Cost Desk

Internal Excel-style air quotation. App routes everything to `/origin-cost-desk`.

## Local

```bash
npm ci
npm run dev
```

Port **5174**. Open `/origin-cost-desk`.

## Layout

- `src/origin-cost-desk/` — UI, quote engine, PDF HTML
- `public/excel/WAC_Air_Quotation_Simulator.xlsx` — Master_DB source
- HKD lanes: TOTAL × Ex.Rate. USD lanes leave TOTAL as-is.
- Pin repeat cases in Input; Save PDF auto-saves history in localStorage.
- Master routes and weight breaks are editable in-session. Deployed rates come from `public/excel/WAC_Air_Quotation_Simulator.xlsx` (no browser Master save / reset).

## Cursor Cloud specific instructions

- `.cursor/environment.json` runs `npm ci`.
- Preview: `npm run dev -- --host 0.0.0.0 --port 5174`
- Typecheck: `npx tsc -b`
- Do not commit `.env` or Excel lock files (`~$*`).
- Logos: `public/wac-logo.png`, `public/wac-mark-hero.png`.
