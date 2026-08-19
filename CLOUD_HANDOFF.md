# Origin Cost Desk Cloud Handoff

## Frontend core files
- `src/pages/OriginCostDeskSite.tsx`
- `src/components/CmMasterEditor.tsx`
- `src/cmDeskQuote.ts`
- `src/cmDeskDocument.ts`
- `src/cmDeskPdf.ts`
- `src/cmExcelMaster.ts`
- `src/cmMasterEdit.ts`
- `src/cmDeskConfig.ts`

## Frontend routing
- `src/App.tsx`

## Shared browser print helper
- `src/quoteDocument.ts`

## Excel source for current desk logic
- `public/excel/WAC_Air_Quotation_Simulator.xlsx`
- `excel-quote/WAC_Air_Quotation_Simulator.xlsx`

## Cloud backend candidate files
- `excel-quote/quote_engine.py`
- `excel-quote/quote_api.py`
- `excel-quote/validate_cases.py`
- `excel-quote/requirements.txt`
- `excel-quote/README.md`

## Current local-only persistence
- History / draft are stored in browser localStorage inside `src/pages/OriginCostDeskSite.tsx`

## Recommended first cloud split
1. Move quote save/search/load from localStorage to API
2. Keep frontend calculation for instant UX
3. Re-check saved quote payload against Python engine
4. Add auth / branch scope for shared history
