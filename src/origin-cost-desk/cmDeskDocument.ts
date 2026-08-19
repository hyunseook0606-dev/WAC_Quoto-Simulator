import type { CmDeskQuoteResult } from './cmDeskQuote'
import { filterLinesForPdf } from './cmDeskPdf'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markSrc() {
  if (typeof window === 'undefined') return '/wac-mark-hero.png'
  return `${window.location.origin}/wac-mark-hero.png`
}

const PRINT_FONT_FACE = `@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&display=swap");
  html, body, table, th, td, h1, h2, p, div, span {
    font-family: "Noto Sans KR", "Malgun Gothic", Calibri, Arial, sans-serif;
  }`

export function buildCmDeskQuotationHtml(opts: {
  origin: string
  destination: string
  consignee?: string
  cargoSummary: string
  carrierCode: string
  remark: string
  quote: CmDeskQuoteResult
  exceptionDraft?: Record<string, string>
  blCount?: number
  cargoSlots?: Array<{
    index: number
    dimensionsText: string
    qtyText: string
    grossText: string
    cbmText: string
    cwText: string
  }>
}): string {
  const {
    origin,
    destination,
    consignee = '',
    cargoSummary,
    carrierCode,
    remark,
    quote,
    exceptionDraft = {},
    blCount = 0,
    cargoSlots,
  } = opts

  const cur = quote.currency
  const pdfLines = filterLinesForPdf(quote.lines, exceptionDraft)
  const rows = pdfLines
    .map(
      (l) => `<tr>
        <td>${esc(l.label)}</td>
        <td class="muted">${esc(l.unit)}</td>
        <td class="right">${cur} ${l.amount.toFixed(2)}</td>
      </tr>`,
    )
    .join('')

  const hasExcelCargo = Array.isArray(cargoSlots) && cargoSlots.length > 0
  const logo = markSrc()

  if (hasExcelCargo) {
    const chargeRowsExcel = pdfLines
      .map(
        (l) => `<tr>
          <td class="desc">${esc(l.label)}</td>
          <td class="amt right">${l.amount.toFixed(2)}</td>
        </tr>`,
      )
      .join('')

    const cargoRows = cargoSlots!
      .slice(0, 10)
      .map((s) => {
        const has = Boolean(s.dimensionsText)
        return `<tr>
          <td class="center">${s.index}</td>
          <td>${has ? esc(s.dimensionsText) : ''}</td>
          <td class="center">${has ? esc(s.qtyText) : ''}</td>
          <td class="center">${has ? esc(s.grossText) : ''}</td>
          <td class="green center">${has ? esc(s.cbmText) : ''}</td>
          <td class="green center">${has ? esc(s.cwText) : ''}</td>
        </tr>`
      })
      .join('')

    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>WAC Air Freight Quotation ${esc(origin)}-${esc(destination)}</title>
<style>
  ${PRINT_FONT_FACE}
  @page { size: A4; margin: 10mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1A2A3A; font-size: 10.5pt; }

  .bar { background: #1A2A3A; color: #fff; padding: 10px 16px; font-weight: 700; letter-spacing: .04em; display:flex; align-items:center; gap:10px; }
  h1 { margin: 12px 0 2px; font-size: 18pt; }
  .sub { color: #64748b; font-size: 9.5pt; margin: 0 0 10px; }

  table { width: 100%; border-collapse: collapse; }
  .ship th, .ship td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10.5pt; }
  .ship .title { background:#1f2d3a; color:#fff; text-align:center; font-weight:700; }
  .ship th { background:#1f2d3a; color:#fff; width: 14%; text-align:left; font-weight:700; }
  .ship td { background:#fff; font-weight:600; }
  .center { text-align:center; }

  .cargo th, .cargo td { border: 1px solid #cbd5e1; padding: 7px 8px; font-size: 10.5pt; }
  .cargo thead th { background:#243447; color:#fff; font-weight:700; }
  .cargo .green { background:#E8F5E8; }
  .cargoTotal td { background:#243447; color:#fff; font-weight:800; }
  .cargoTotal .green { background:#E8F5E8; color:#1e293b; font-weight:800; }

  .remarkTable { width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; margin-top: 8px; }
  .remarkTable th { background:#243447; color:#fff; font-weight:700; padding: 7px 10px; width: 16%; text-align:left; }
  .remarkTable td { padding: 10px 10px; background:#fff; font-weight:600; color:#1e293b; }

  .charges th, .charges td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10.5pt; }
  .charges thead th { background:#243447; color:#fff; font-weight:700; }
  .charges .desc { width: 72%; }
  .right { text-align:right; }

  .charges .grandBar td { background:#F05023; color:#fff; font-weight:800; text-align:center; padding: 8px 10px; }
  .charges .grandVal td { background:#fff7ed; font-weight:900; font-size: 18pt; padding: 10px 10px; text-align:right; }
  .foot { margin-top: 12px; color: #64748b; font-size: 9pt; }
</style>
</head>
<body>
  <div class="bar"><img src="${logo}" alt="WAC" style="height:18px; width:auto;" />WAC LOGISTICS</div>
  <h1>AIR FREIGHT QUOTATION</h1>
  <div class="sub">Approximate quote · Not a final invoice</div>

  <table class="ship">
    <thead>
      <tr><th class="title" colspan="6">Shipment</th></tr>
    </thead>
    <tbody>
      ${consignee.trim() ? `<tr>
        <th>Consignee</th><td colspan="5">${esc(consignee)}</td>
      </tr>` : ''}
      <tr>
        <th>Route</th><td class="center">${esc(quote.route)}</td>
        <th>B/L</th><td class="center">${Number.isFinite(blCount) && blCount > 0 ? blCount : 1}</td>
        <th>Currency</th><td class="center">${esc(quote.currency)}</td>
      </tr>
      <tr>
        <th>C.W.</th><td class="center">${quote.cw.toFixed(2)}</td>
        <th>CBM</th><td class="center">${quote.cbm.toFixed(3)}</td>
        <th>Break</th><td class="center">${esc(quote.breakLabel)}</td>
      </tr>
      <tr>
        <th>Carrier</th><td colspan="5">${esc(carrierCode)}</td>
      </tr>
    </tbody>
  </table>

  <div style="height:10px"></div>

  <table class="cargo">
    <thead>
      <tr>
        <th style="width:7%">#</th>
        <th style="width:38%">Dimensions (cm)</th>
        <th style="width:12%">Qty</th>
        <th style="width:15%">Gross</th>
        <th style="width:14%">CBM</th>
        <th style="width:14%">C.W.</th>
      </tr>
    </thead>
    <tbody>
      ${cargoRows}
      <tr class="cargoTotal">
        <td colspan="4">TOTAL</td>
        <td class="green center">${quote.cbm.toFixed(3)}</td>
        <td class="green center">${quote.cw.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <table class="remarkTable">
    <tr>
      <th>Remark</th>
      <td>${remark.trim() ? esc(remark) : ''}</td>
    </tr>
  </table>

  <div style="height:10px"></div>

  <table class="charges">
    <thead>
      <tr>
        <th class="desc">Description</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${chargeRowsExcel}
      <tr class="grandBar"><td colspan="2">TOTAL APPX. AMOUNT</td></tr>
      <tr class="grandVal"><td colspan="2">${cur} ${quote.total.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <div class="foot">This quotation is indicative and subject to confirmation.</div>
</body>
</html>`
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>WAC Air Freight Quotation ${esc(origin)}-${esc(destination)}</title>
<style>
  ${PRINT_FONT_FACE}
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1A2A3A; font-size: 11pt; background:#ffffff; }
  .sheet { border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 18px 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
  .header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom: 10px; }
  .brand { display:flex; align-items:center; gap:12px; }
  .brandMark { height: 34px; width: auto; display:block; }
  .brandText { font-size: 14px; font-weight: 800; letter-spacing: .08em; color:#1A2A3A; text-transform: uppercase; }
  .quoteBadge { padding: 6px 10px; border-radius: 999px; background:#fff7ed; color:#F05023; font-size: 9pt; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .accent { height: 4px; border-radius: 999px; background: linear-gradient(90deg, #1A2A3A 0%, #243447 60%, #F05023 100%); margin-bottom: 14px; }
  h1 { margin: 0 0 4px; font-size: 22pt; letter-spacing: .01em; }
  .sub { color: #64748b; font-size: 10pt; margin-bottom: 18px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.meta th, table.meta td { border: 1px solid #dbe4ee; padding: 8px 12px; text-align: left; font-size: 10pt; }
  table.meta th { background: #243447; color: #fff; width: 28%; font-weight: 700; }
  table.chg { width: 100%; border-collapse: collapse; }
  table.chg th { background: #243447; color: #fff; padding: 9px 12px; text-align: left; font-size: 13px; }
  table.chg td { border: 1px solid #dbe4ee; padding: 9px 12px; }
  .right { text-align: right; font-weight: 700; }
  .muted { color: #64748b; font-size: 9pt; font-weight: 600; }
  .note { color: #94a3b8; font-size: 8.5pt; font-weight: 400; margin-top: 2px; }
  .total-label { background: #F05023; color: #fff; font-weight: 800; letter-spacing:.04em; }
  .total-amt { background: #fff7ed; color: #1e293b; font-weight: 900; font-size: 14pt; }
  .total td { border-color: #F05023; }
  .foot { margin-top: 14px; color: #64748b; font-size: 9pt; }
</style>
</head>
<body>
  <div class="sheet">
  <div class="header">
    <div class="brand">
      <img class="brandMark" src="${logo}" alt="WAC" />
      <div class="brandText">WAC LOGISTICS</div>
    </div>
    <div class="quoteBadge">Air Freight Quote</div>
  </div>
  <div class="accent"></div>
  <h1>AIR FREIGHT QUOTATION</h1>
  <div class="sub">Approximate quote · Not a final invoice</div>
  <table class="meta">
    ${consignee.trim() ? `<tr><th>Consignee</th><td>${esc(consignee)}</td></tr>` : ''}
    <tr><th>Route</th><td>${esc(origin)} → ${esc(destination)} · ${esc(quote.route)}</td></tr>
    <tr><th>Cargo</th><td>${esc(cargoSummary)}</td></tr>
    <tr><th>C.W. / CBM</th><td><b>${quote.cw.toFixed(2)} kg</b> · ${quote.cbm.toFixed(3)} CBM · Break ${esc(quote.breakLabel)}</td></tr>
    <tr><th>Carrier</th><td>${esc(carrierCode)}</td></tr>
    <tr><th>Currency</th><td>${cur}</td></tr>
    ${remark.trim() ? `<tr><th>Remark</th><td>${esc(remark)}</td></tr>` : ''}
  </table>
  <table class="chg">
    <thead><tr><th>Charge</th><th>Unit</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td colspan="2" class="total-label">TOTAL APPX. AMOUNT</td>
        <td class="total-amt right">${cur} ${quote.total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  </div>
</body>
</html>`
}

export function buildCmDeskPlainTable(quote: CmDeskQuoteResult): string {
  const header = ['Charge', 'Unit', 'Ref(Master)', 'Exception', 'Amount'].join('\t')
  const rows = quote.lines.map((l) =>
    [
      l.label,
      l.unit,
      l.ref.toFixed(2),
      l.override != null ? l.override.toFixed(2) : '',
      l.amount.toFixed(2),
    ].join('\t'),
  )
  return [header, ...rows, '', `TOTAL\t\t\t\t${quote.total.toFixed(2)}`].join('\n')
}
