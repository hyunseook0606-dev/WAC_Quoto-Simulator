import type { CmDeskQuoteResult } from './cmDeskQuote'
import { filterLinesForPdf } from './cmDeskPdf'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Relative path only — print layer inlines this to a data URL so localhost never appears. */
function logoSrc() {
  return '/wac-logo.png'
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
  const filledCargo = (cargoSlots ?? []).filter((s) => s.dimensionsText)
  const density =
    pdfLines.length >= 18 || filledCargo.length >= 6
      ? 'tight'
      : pdfLines.length >= 12 || filledCargo.length >= 3
        ? 'compact'
        : 'normal'

  const rows = pdfLines
    .map(
      (l) => `<tr>
        <td>${esc(l.label)}</td>
        <td class="muted">${esc(l.unit)}</td>
        <td class="right">${cur} ${l.amount.toFixed(2)}</td>
      </tr>`,
    )
    .join('')

  const cargoTable =
    filledCargo.length === 0
      ? ''
      : `<table class="cargo">
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
      ${filledCargo
        .map(
          (s) => `<tr>
        <td class="center">${s.index}</td>
        <td>${esc(s.dimensionsText)}</td>
        <td class="center">${esc(s.qtyText)}</td>
        <td class="center">${esc(s.grossText)}</td>
        <td class="center green">${esc(s.cbmText)}</td>
        <td class="center green">${esc(s.cwText)}</td>
      </tr>`,
        )
        .join('')}
      <tr class="cargoTotal">
        <td colspan="4">TOTAL</td>
        <td class="center green">${quote.cbm.toFixed(3)}</td>
        <td class="center green">${quote.cw.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>`

  const bl = Number.isFinite(blCount) && blCount > 0 ? blCount : 1
  const logo = logoSrc()

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>AIR FREIGHT QUOTATION</title>
<style>
  ${PRINT_FONT_FACE}
  /* margin:0 hides Chrome/Edge print header/footer (localhost URL) */
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 210mm;
    color: #1A2A3A;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    padding: 8mm 10mm 7mm;
    background: #ffffff;
  }
  .header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom: 6px; }
  .brandMarkWrap { background:#ffffff; border: 1px solid #e8eef4; border-radius: 8px; padding: 4px 8px; }
  .brandMark { height: 26px; width: auto; display:block; }
  .quoteBadge { padding: 4px 8px; border-radius: 999px; background:#fff7ed; color:#F05023; font-size: 8pt; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .accent { height: 3px; border-radius: 999px; background: linear-gradient(90deg, #1A2A3A 0%, #243447 60%, #F05023 100%); margin-bottom: 8px; }
  h1 { margin: 0 0 2px; font-size: 16pt; letter-spacing: .01em; }
  .sub { color: #64748b; font-size: 8pt; margin-bottom: 8px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
  table.meta th, table.meta td { border: 1px solid #dbe4ee; padding: 4px 8px; text-align: left; font-size: 8.5pt; vertical-align: top; }
  table.meta th { background: #243447; color: #fff; width: 14%; font-weight: 700; }
  table.meta td { width: 36%; }
  table.chg { width: 100%; border-collapse: collapse; }
  table.chg th { background: #243447; color: #fff; padding: 5px 8px; text-align: left; font-size: 9pt; }
  table.chg td { border: 1px solid #dbe4ee; padding: 4px 8px; font-size: 9pt; }
  .right { text-align: right; font-weight: 700; }
  .muted { color: #64748b; font-size: 8pt; font-weight: 600; }
  .total-label { background: #F05023; color: #fff; font-weight: 800; letter-spacing:.04em; }
  .total-amt { background: #fff7ed; color: #1e293b; font-weight: 900; font-size: 11pt; }
  .total td { border-color: #F05023; }
  table.cargo { width: 100%; border-collapse: collapse; margin: 0 0 8px; }
  table.cargo th, table.cargo td { border: 1px solid #dbe4ee; padding: 3px 6px; font-size: 8pt; }
  table.cargo thead th { background:#243447; color:#fff; font-weight:700; text-align:left; }
  table.cargo .center { text-align:center; }
  table.cargo .green { background:#E8F5E8; }
  table.cargo .cargoTotal td { background:#243447; color:#fff; font-weight:800; }
  table.cargo .cargoTotal .green { background:#E8F5E8; color:#1e293b; font-weight:800; }
  .foot { margin-top: 6px; color: #64748b; font-size: 7.5pt; }

  body.compact h1 { font-size: 14pt; }
  body.compact .brandMark { height: 22px; }
  body.compact table.meta th, body.compact table.meta td { padding: 3px 6px; font-size: 8pt; }
  body.compact table.chg th { padding: 4px 6px; font-size: 8pt; }
  body.compact table.chg td { padding: 3px 6px; font-size: 8pt; }
  body.compact table.cargo th, body.compact table.cargo td { padding: 2px 5px; font-size: 7.5pt; }
  body.compact .total-amt { font-size: 10pt; }

  body.tight h1 { font-size: 13pt; }
  body.tight .sub { margin-bottom: 5px; }
  body.tight .brandMark { height: 20px; }
  body.tight table.meta { margin-bottom: 5px; }
  body.tight table.meta th, body.tight table.meta td { padding: 2px 5px; font-size: 7.5pt; }
  body.tight table.chg th { padding: 3px 5px; font-size: 7.5pt; }
  body.tight table.chg td { padding: 2px 5px; font-size: 7.5pt; }
  body.tight table.cargo { margin-bottom: 5px; }
  body.tight table.cargo th, body.tight table.cargo td { padding: 1px 4px; font-size: 7pt; }
  body.tight .total-amt { font-size: 9.5pt; }
  body.tight .foot { margin-top: 4px; font-size: 7pt; }
</style>
</head>
<body class="${density}">
  <div class="sheet">
  <div class="header">
    <div class="brandMarkWrap">
      <img class="brandMark" src="${logo}" alt="WAC Logistics" />
    </div>
    <div class="quoteBadge">Air Freight Quote</div>
  </div>
  <div class="accent"></div>
  <h1>AIR FREIGHT QUOTATION</h1>
  <div class="sub">Approximate quote · Not a final invoice</div>
  <table class="meta">
    <tr>
      ${consignee.trim() ? `<th>Consignee</th><td>${esc(consignee)}</td>` : `<th>Route</th><td>${esc(origin)} → ${esc(destination)}</td>`}
      <th>B/L</th><td>${bl}</td>
    </tr>
    <tr>
      ${consignee.trim() ? `<th>Route</th><td>${esc(origin)} → ${esc(destination)}</td>` : `<th>Carrier</th><td>${esc(carrierCode)}</td>`}
      <th>Currency</th><td>${cur}</td>
    </tr>
    <tr>
      <th>Cargo</th><td colspan="3">${esc(cargoSummary)}</td>
    </tr>
    <tr>
      <th>C.W. / CBM</th>
      <td><b>${quote.cw.toFixed(2)} kg</b> · ${quote.cbm.toFixed(3)} CBM · ${esc(quote.breakLabel)}</td>
      ${consignee.trim() ? `<th>Carrier</th><td>${esc(carrierCode)}</td>` : `<th>Lane</th><td>${esc(quote.route)}</td>`}
    </tr>
    ${remark.trim() ? `<tr><th>Remark</th><td colspan="3">${esc(remark)}</td></tr>` : ''}
  </table>
  ${cargoTable}
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
  <div class="foot">This quotation is indicative and subject to confirmation.</div>
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
