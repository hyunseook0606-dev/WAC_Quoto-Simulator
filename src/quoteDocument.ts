import type { buildDeskCostSheet } from './originCost'
import { MASTER_VALIDITY } from './originCost'

type DeskSheet = NonNullable<ReturnType<typeof buildDeskCostSheet>>

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildDeskQuotationHtml(opts: {
  origin: string
  destination: string
  length: number
  width: number
  height: number
  weight: number
  cw: number
  cbm: number
  carrierCode: string
  carrierName: string
  usdHkd: number
  remark: string
  validUntil: string
  deskSheet: DeskSheet
}): string {
  const {
    origin,
    destination,
    length,
    width,
    height,
    weight,
    cw,
    cbm,
    carrierCode,
    carrierName,
    usdHkd,
    remark,
    validUntil,
    deskSheet,
  } = opts

  const rows = deskSheet.lines
    .map(
      (l) => `<tr>
        <td>${esc(l.label)}${l.note ? `<div class="note">${esc(l.note)}</div>` : ''}</td>
        <td class="muted">${esc(l.group)}</td>
        <td class="right">${esc(l.currency)} ${l.amount.toFixed(2)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>WAC Air Freight Quotation ${esc(origin)}-${esc(destination)}</title>
<style>
  @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&display=swap");
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Noto Sans KR", "Malgun Gothic", Calibri, Arial, sans-serif; color: #1A2A3A; font-size: 11pt; }
  .bar { background: #1A2A3A; color: #fff; padding: 10px 16px; font-weight: 700; letter-spacing: .04em; }
  h1 { margin: 14px 0 4px; font-size: 22pt; }
  .sub { color: #64748b; font-size: 10pt; margin-bottom: 16px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.meta th, table.meta td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-size: 10pt; }
  table.meta th { background: #1A2A3A; color: #fff; width: 28%; font-weight: 600; }
  table.chg { width: 100%; border-collapse: collapse; }
  table.chg th { background: #1A2A3A; color: #fff; padding: 8px 10px; text-align: left; font-size: 10pt; }
  table.chg td { border: 1px solid #cbd5e1; padding: 7px 10px; }
  .right { text-align: right; font-weight: 700; }
  .muted { color: #64748b; text-transform: uppercase; font-size: 9pt; }
  .note { color: #94a3b8; font-size: 8.5pt; font-weight: 400; margin-top: 2px; }
  .total { background: #F05023; color: #fff; }
  .total td { border-color: #F05023; font-weight: 800; }
  .foot { margin-top: 14px; color: #64748b; font-size: 9pt; }
</style>
</head>
<body>
  <div class="bar">WAC LOGISTICS</div>
  <h1>AIR FREIGHT QUOTATION</h1>
  <div class="sub">Approximate quote · Not a final invoice</div>
  <table class="meta">
    <tr><th>Route</th><td>${esc(origin)} → ${esc(destination)}</td></tr>
    <tr><th>Cargo</th><td>${length} × ${width} × ${height} cm · Gross ${weight.toFixed(1)} kg</td></tr>
    <tr><th>C.W. / CBM</th><td><b>${cw.toFixed(2)} kg</b> · ${cbm.toFixed(3)} CBM</td></tr>
    <tr><th>Carrier</th><td>${esc(carrierCode)} ${esc(carrierName)}</td></tr>
    <tr><th>Valid until</th><td>${esc(validUntil)}</td></tr>
    <tr><th>FX USD/HKD</th><td>${usdHkd.toFixed(4)} · Master ${MASTER_VALIDITY.effective} → ${MASTER_VALIDITY.expiry}</td></tr>
    ${remark.trim() ? `<tr><th>Remark</th><td>${esc(remark)}</td></tr>` : ''}
  </table>
  <table class="chg">
    <thead><tr><th>Charge</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${rows}
      <tr><td colspan="2">Air (HKD)</td><td class="right">HKD ${deskSheet.airHkd.toFixed(2)}</td></tr>
      <tr><td colspan="2">Local master (HKD)</td><td class="right">HKD ${deskSheet.localHkd.toFixed(2)}</td></tr>
      <tr><td colspan="2">Variable / exception (HKD)</td><td class="right">HKD ${deskSheet.variableHkd.toFixed(2)}</td></tr>
      <tr class="total"><td colspan="2">TOTAL APPX. AMOUNT</td><td class="right">HKD ${deskSheet.totalHkd.toFixed(2)}</td></tr>
      <tr><td colspan="2">TOTAL APPX. USD</td><td class="right">USD ${deskSheet.totalUsd.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <div class="foot">This quotation is indicative and subject to confirmation. Exceptions override Master for this job only.</div>
</body>
</html>`
}

export function printQuotation(html: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()

  const run = async () => {
    const win = iframe.contentWindow
    const idoc = iframe.contentDocument
    if (!win || !idoc) {
      iframe.remove()
      return
    }
    try {
      if (idoc.fonts?.ready) await idoc.fonts.ready
    } catch {
      // keep going with system fallback fonts
    }
    const images = Array.from(idoc.images)
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }),
      ),
    )
    await new Promise((r) => window.setTimeout(r, 120))
    win.focus()
    win.print()
    window.setTimeout(() => iframe.remove(), 1500)
  }

  if (iframe.contentDocument?.readyState === 'complete') {
    void run()
  } else {
    iframe.onload = () => {
      void run()
    }
  }
}
