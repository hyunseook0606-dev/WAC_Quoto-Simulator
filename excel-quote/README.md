# WAC Air Quotation Simulator (Excel)

Rebuild: `python build_workbook.py`  
Baseline: `WAC_Air_Quotation_Simulator (2).xlsx` (CM email UI) — script **copies then patches** (does not redraw the whole layout).

## Essence

Generic desk air quotation tool:
- **Master_DB** — nearly-fixed rates (yellow cells)
- **입력** — cargo + auto C.W. + 참고 / 예외 + Other slots
- **견적서** — 100% refs to 입력
- Special cases (KEEP COOL etc.) → use **예외 / Other**, do not rewrite the template

## Patches applied on rebuild

- Air table: `-45` column + sample `HKG-ICN` lane
- Local master: Handling / Doc / Trucking / Terminal / CFS / Pickup / Export / RE-PACK / XRAY / Gate (short notes, no mid-table overlay)
- Input: Terminal + Other 1–6, TOTAL with optional HKD×Ex.Rate
- Guide sheet with usage

## C.W. / units

- Piece `MAX(Gross, CBM×167)` then TOTAL = Σ
- Trucking = CBM · Terminal/CFS/XRAY = C.W.(kg)
