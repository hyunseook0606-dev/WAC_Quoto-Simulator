import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import {
  Plane,
  Box,
  ArrowRight,
  Loader2,
  Calculator,
  Lock,
  FileSpreadsheet,
} from 'lucide-react'
import { PublicQuoteDHL } from './components/PublicQuoteDHL'
import { CmDeskQuotePanel, buildCmDeskPlainTable, printCmDeskQuote } from './origin-cost-desk/components/CmDeskQuotePanel'
import { CmMasterEditor } from './origin-cost-desk/components/CmMasterEditor'
import { SiteFooter, SiteHeader, Reveal } from './chrome'
import { HomePage } from './pages/HomePage'
import { TrackPage } from './pages/TrackPage'
import { OriginCostDeskSite } from './origin-cost-desk/OriginCostDeskSite'
import {
  calcCmQuote,
  parseCmMasterFile,
  parseCmMasterFromWorkbook,
  type CmMaster,
} from './origin-cost-desk/cmExcelMaster'
import { calcCmDeskQuote, parseCmExceptions } from './origin-cost-desk/cmDeskQuote'
import type { CmExtraOther } from './origin-cost-desk/cmDeskConfig'
import * as XLSX from 'xlsx'

type Cargo = {
  length: number
  width: number
  height: number
  weight: number
}

/**
 * ex-HKG major carriers from:
 * ??? ?????????? 2026JULY.docx
 * RH/SQ weight breaks from WAC customer quote email (mock until CargoAI/DB).
 */
const CARRIERS = [
  {
    code: 'CX',
    prefix: '160',
    name: 'Cathay Pacific',
    hub: 'HKG',
    schedule: 'SIN/HKG daily freighter & belly',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.85, 1.35, 1.15, 1.0, 0.9],
    fuelPerKg: 0.14,
    extraPerKg: 0,
    extraLabel: '',
    cgFee: 8,
    color: '#006564',
  },
  {
    code: 'KE',
    prefix: '180',
    name: 'Korean Air',
    hub: 'ICN',
    schedule: 'Daily Asia corridor',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.75, 1.28, 1.1, 0.98, 0.88],
    fuelPerKg: 0.13,
    extraPerKg: 0,
    extraLabel: '',
    cgFee: 7,
    color: '#05184D',
  },
  {
    code: 'OZ',
    prefix: '988',
    name: 'Asiana Airlines',
    hub: 'ICN',
    schedule: 'Daily / multi-freq',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.7, 1.22, 1.05, 0.95, 0.85],
    fuelPerKg: 0.12,
    extraPerKg: 0,
    extraLabel: '',
    cgFee: 7,
    color: '#6B2D5B',
  },
  {
    code: 'RH',
    prefix: '828',
    name: 'Hong Kong Air Cargo',
    hub: 'HKG',
    schedule: 'SIN/HKG daily except day 1',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.65, 1.15, 0.95, 0.85, 0.8],
    fuelPerKg: 0.12,
    extraPerKg: 0,
    extraLabel: '',
    cgFee: 5,
    color: '#C8102E',
    logoSrc: '/airline-rh.svg',
  },
  {
    code: 'LD',
    prefix: '288',
    name: 'Air Hong Kong',
    hub: 'HKG',
    schedule: 'DHL network freighter',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.6, 1.18, 1.0, 0.9, 0.82],
    fuelPerKg: 0.11,
    extraPerKg: 0.05,
    extraLabel: 'XBC',
    cgFee: 6,
    color: '#D40511',
  },
  {
    code: 'CZ',
    prefix: '784',
    name: 'China Southern',
    hub: 'CAN',
    schedule: 'China gateway uplift',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.55, 1.1, 0.95, 0.85, 0.78],
    fuelPerKg: 0.11,
    extraPerKg: 0,
    extraLabel: '',
    cgFee: 6,
    color: '#0055A5',
  },
  {
    code: 'MU',
    prefix: '781',
    name: 'China Eastern',
    hub: 'PVG',
    schedule: 'SHA/PVG connection',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.55, 1.12, 0.98, 0.88, 0.8],
    fuelPerKg: 0.11,
    extraPerKg: 0,
    extraLabel: '',
    cgFee: 6,
    color: '#E4002B',
  },
  {
    code: 'SQ',
    prefix: '618',
    name: 'Singapore Airlines',
    hub: 'SIN',
    schedule: 'SIN/HKG daily',
    breaks: [45, 100, 250, 500, 1000],
    rates: [1.7, 1.25, 1.15, 1.0, 0.85],
    fuelPerKg: 0.1,
    extraPerKg: 0.2,
    extraLabel: 'XBC',
    cgFee: 6,
    color: '#00266B',
    logoSrc: '/airline-sq.svg',
  },
  {
    code: 'EK',
    prefix: '176',
    name: 'Emirates SkyCargo',
    hub: 'DXB',
    schedule: 'Widebody freighter',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.95, 1.45, 1.25, 1.1, 0.98],
    fuelPerKg: 0.15,
    extraPerKg: 0.08,
    extraLabel: 'XBC',
    cgFee: 10,
    color: '#D71921',
  },
  {
    code: 'QR',
    prefix: '157',
    name: 'Qatar Airways',
    hub: 'DOH',
    schedule: 'Freighter & belly',
    breaks: [45, 100, 300, 500, 1000],
    rates: [1.9, 1.42, 1.22, 1.08, 0.95],
    fuelPerKg: 0.14,
    extraPerKg: 0.08,
    extraLabel: 'XBC',
    cgFee: 9,
    color: '#5C0632',
  },
  {
    code: 'LH',
    prefix: '020',
    name: 'Lufthansa Cargo',
    hub: 'FRA',
    schedule: 'Europe gateway',
    breaks: [45, 100, 300, 500, 1000],
    rates: [2.05, 1.55, 1.35, 1.2, 1.05],
    fuelPerKg: 0.16,
    extraPerKg: 0.1,
    extraLabel: 'XBC',
    cgFee: 12,
    color: '#05164D',
  },
  {
    code: 'CV',
    prefix: '172',
    name: 'Cargolux',
    hub: 'LUX',
    schedule: 'Main-deck freighter',
    breaks: [45, 100, 300, 500, 1000],
    rates: [2.0, 1.5, 1.3, 1.15, 1.0],
    fuelPerKg: 0.15,
    extraPerKg: 0.1,
    extraLabel: 'XBC',
    cgFee: 11,
    color: '#FFCC00',
  },
] as const

/** Local origin charges from WAC quote email (ex-work) */
const EX_WORK_CHARGES = [
  { label: 'Export Permit', value: '$50.00 per set' },
  { label: 'Doc Fee', value: '$50.00 per set' },
  { label: 'Export Transfer Fee', value: '$0.08/kg or Minimum $20.00/shipment' },
  { label: 'Wt. Verification', value: '$2.00/shipment' },
  { label: 'Screening fee', value: '$0.03/kg or Minimum $20.00' },
  { label: 'AWB fee', value: '$10.00/set' },
  { label: 'Fuel Surcharge', value: '$15.00 per trip' },
  { label: 'TRUCKING CHG', value: '$200.00 (Collect & delivery to FTZ)' },
]

type Carrier = (typeof CARRIERS)[number]

function pickBreakRate(breaks: readonly number[], rates: readonly number[], cw: number) {
  let rate = rates[0]
  for (let i = 0; i < breaks.length; i++) {
    if (cw >= breaks[i]) rate = rates[i]
  }
  return rate
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pad(str: string, len: number) {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length)
}

/** Build WAC-style quote for Outlook: HTML table + clean plain fallback */
function buildCarrierEmailDraft(opts: {
  origin: string
  destination: string
  length: number
  width: number
  height: number
  weight: number
  cw: number
  carrier: Carrier & {
    ratePerKg: number
    base: number
    surcharge: number
    total: number
  }
  validUntil: string
}): { html: string; plain: string } {
  const {
    origin,
    destination,
    length,
    width,
    height,
    weight,
    cw,
    carrier,
    validUntil,
  } = opts

  const destName =
    destination === 'HKG'
      ? 'Hong Kong'
      : destination === 'SIN'
        ? 'Singapore'
        : destination

  const headers = ['Destination', 'AIRPORT', ...carrier.breaks.map(String)]
  const values = [
    destName,
    destination,
    ...carrier.rates.map((r) => `$${r.toFixed(2)}`),
  ]

  const plainTable = [
    headers.join('\t'),
    values.join('\t'),
  ].join('\n')

  const htmlTable = `
<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#94a3b8;font-family:Calibri,Arial,sans-serif;font-size:12pt;">
  <thead>
    <tr style="background:#f1f5f9;">
      ${headers.map((h) => `<th style="text-align:left;padding:6px 10px;">${escapeHtml(h)}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    <tr>
      ${values.map((v) => `<td style="padding:6px 10px;">${escapeHtml(v)}</td>`).join('')}
    </tr>
  </tbody>
</table>`.trim()

  const extraPlain =
    carrier.extraPerKg > 0
      ? `${carrier.extraLabel || 'Extra'} at $${carrier.extraPerKg.toFixed(2)}/kg on C.W.\n`
      : ''
  const extraHtml =
    carrier.extraPerKg > 0
      ? `<div>${escapeHtml(carrier.extraLabel || 'Extra')} at $${carrier.extraPerKg.toFixed(2)}/kg on C.W.</div>`
      : ''

  const exWorkPlain = EX_WORK_CHARGES.map(
    (c) => `${pad(c.label + ':', 22)} ${c.value}`,
  ).join('\n')

  const exWorkHtml = `
<table cellpadding="4" cellspacing="0" border="0" style="font-family:Calibri,Arial,sans-serif;font-size:12pt;">
  ${EX_WORK_CHARGES.map(
    (c) =>
      `<tr><td style="padding:2px 24px 2px 0;white-space:nowrap;">${escapeHtml(c.label)}</td><td style="padding:2px 0;">${escapeHtml(c.value)}</td></tr>`,
  ).join('')}
</table>`.trim()

  const plain = `Dear Customer,

Please see below for the air freight cost from ${origin} to ${destination}.

${length} x ${width} x ${height}cm / 1PTL, ${weight.toFixed(1)}KGS
Chargeable Weight (C.W.): ${cw.toFixed(1)} KGS
Quote valid until: ${validUntil}

Kindly find the rate as below (All in USD)

${carrier.code} ??${carrier.name} (AWB Prefix ${carrier.prefix})
${plainTable}
MYC at $${carrier.fuelPerKg.toFixed(2)}/kg on C.W.
${extraPlain}CG fee at $${carrier.cgFee.toFixed(2)}/MAWB
Schedule: ${carrier.schedule}

Estimated airfreight total (based on C.W. ${cw.toFixed(1)} kg @ $${carrier.ratePerKg.toFixed(2)}/kg):
USD ${carrier.total.toFixed(2)}

Ex-work charges:-
${exWorkPlain}

* Subject to final capacity, equipment availability and WAC confirmation.
Best regards,
WAC Logistics ??Digital Freight Desk`

  const html = `<!DOCTYPE html>
<html><body style="font-family:Calibri,Arial,sans-serif;font-size:12pt;color:#1A2A3A;line-height:1.45;">
<div>Dear Customer,</div>
<br/>
<div>Please see below for the air freight cost from <b>${escapeHtml(origin)}</b> to <b>${escapeHtml(destination)}</b>.</div>
<br/>
<div>${length} x ${width} x ${height}cm / 1PTL, ${weight.toFixed(1)}KGS</div>
<div>Chargeable Weight (C.W.): <b>${cw.toFixed(1)} KGS</b></div>
<div>Quote valid until: ${escapeHtml(validUntil)}</div>
<br/>
<div>Kindly find the rate as below (All in USD)</div>
<br/>
<div><u><b>${escapeHtml(carrier.code)}</b></u> ??${escapeHtml(carrier.name)} (AWB Prefix ${escapeHtml(carrier.prefix)})</div>
<br/>
${htmlTable}
<br/>
<div>MYC at $${carrier.fuelPerKg.toFixed(2)}/kg on C.W.</div>
${extraHtml}
<div>CG fee at $${carrier.cgFee.toFixed(2)}/MAWB</div>
<div>Schedule: ${escapeHtml(carrier.schedule)}</div>
<br/>
<div>Estimated airfreight total (based on C.W. ${cw.toFixed(1)} kg @ $${carrier.ratePerKg.toFixed(2)}/kg):</div>
<div style="font-size:14pt;"><b>USD ${carrier.total.toFixed(2)}</b></div>
<br/>
<div><u><b>Ex-work charges:-</b></u></div>
${exWorkHtml}
<br/>
<div style="color:#64748b;font-size:10pt;">* Subject to final capacity, equipment availability and WAC confirmation.</div>
<br/>
<div>Best regards,<br/>WAC Logistics ??Digital Freight Desk</div>
</body></html>`

  return { html, plain }
}

function formatValidUntil(daysAhead = 7) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function QuoteWorkspace() {
  const [searchParams] = useSearchParams()
  const [origin, setOrigin] = useState(
    (searchParams.get('from') || 'SIN').toUpperCase(),
  )
  const [destination, setDestination] = useState(
    (searchParams.get('to') || 'HKG').toUpperCase(),
  )
  const [cargo, setCargo] = useState<Cargo>({
    length: 120,
    width: 100,
    height: 60,
    weight: 83.6,
  })
  const [copied, setCopied] = useState('')
  const [showResult, setShowResult] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [formError, setFormError] = useState('')
  /** public = shipper indicative ? desk = internal cost with variable slots */
  const [quoteMode, setQuoteMode] = useState<'public' | 'desk'>(
    searchParams.get('mode') === 'desk' ? 'desk' : 'public',
  )
  const [deskCarrier, setDeskCarrier] = useState('KE')
  const [cmExceptionDraft, setCmExceptionDraft] = useState<Record<string, string>>({})
  const [cmOtherLabels, setCmOtherLabels] = useState<Record<string, string>>({})
  const [cmOtherUnits, setCmOtherUnits] = useState<Record<string, string>>({})
  const [cmExtraOthers, setCmExtraOthers] = useState<CmExtraOther[]>([])
  const [blCount, setBlCount] = useState(1)
  const [cmFxRate, setCmFxRate] = useState(1)
  const [deskRemark, setDeskRemark] = useState('')
  const [cmMaster, setCmMaster] = useState<CmMaster | null>(null)
  const [cmQty, setCmQty] = useState(1)
  const [cmImportMsg, setCmImportMsg] = useState('')
  const cmFileRef = useRef<HTMLInputElement>(null)

  /** Excel Master_DB is the rate backend for Instant Quote */
  useEffect(() => {
    if (cmMaster) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/excel/WAC_Air_Quotation_Simulator.xlsx')
        if (!res.ok) return
        const buf = await res.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        if (cancelled) return
        setCmMaster(
          parseCmMasterFromWorkbook(wb, 'WAC_Air_Quotation_Simulator.xlsx'),
        )
        setCmImportMsg('CM Master_DB loaded from bundled Excel')
      } catch {
        /* optional asset */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cmMaster])

  const volWeight = (cargo.length * cargo.width * cargo.height) / 6000
  const cw = Math.max(Number(cargo.weight) || 0, volWeight || 0)

  const cmQuote = useMemo(() => {
    if (!cmMaster) return null
    return calcCmQuote(cmMaster, {
      origin,
      destination,
      length: Number(cargo.length) || 0,
      width: Number(cargo.width) || 0,
      height: Number(cargo.height) || 0,
      qty: cmQty,
      gross: Number(cargo.weight) || 0,
      blCount: 1,
    })
  }, [cmMaster, origin, destination, cargo, cmQty])

  const quotes = useMemo(() => {
    return CARRIERS.map((c) => {
      const ratePerKg = pickBreakRate(c.breaks, c.rates, cw)
      const base = ratePerKg * cw
      const surcharge = c.fuelPerKg * cw + c.extraPerKg * cw + c.cgFee
      const total = base + surcharge
      return { ...c, ratePerKg, base, surcharge, total }
    }).sort((a, b) => a.total - b.total)
  }, [cw])

  const bestPublic = quotes[0]

  const cmDeskQuote = useMemo(() => {
    if (!cmMaster || quoteMode !== 'desk') return null
    return calcCmDeskQuote(cmMaster, {
      origin,
      destination,
      length: Number(cargo.length) || 0,
      width: Number(cargo.width) || 0,
      height: Number(cargo.height) || 0,
      qty: cmQty,
      gross: Number(cargo.weight) || 0,
      blCount,
      fx: cmFxRate,
      exceptions: parseCmExceptions(cmExceptionDraft),
      otherLabels: cmOtherLabels,
      otherUnits: cmOtherUnits,
      extraOthers: cmExtraOthers,
    })
  }, [
    cmMaster,
    quoteMode,
    origin,
    destination,
    cargo,
    cmQty,
    blCount,
    cmFxRate,
    cmExceptionDraft,
    cmOtherLabels,
    cmOtherUnits,
    cmExtraOthers,
  ])

  const deskCw = cmDeskQuote?.cw ?? cw

  const quoteValidUntil = useMemo(() => formatValidUntil(7), [showResult])

  const updateCargo = (key: keyof Cargo, value: string) => {
    setCargo({ ...cargo, [key]: Number(value) })
  }

  const handleCalculate = () => {
    const o = origin.trim().toUpperCase()
    const d = destination.trim().toUpperCase()
    if (!o || !d) {
      setFormError('????? ???? ?? ??(?? SIN, HKG)???????????')
      return
    }
    if (
      ![cargo.length, cargo.width, cargo.height, cargo.weight].every(
        (n) => Number.isFinite(n) && n > 0,
      )
    ) {
      setFormError('???? ?????? ????? ?????????')
      return
    }
    setFormError('')
    setOrigin(o)
    setDestination(d)
    setShowResult(false)
    setIsLoading(true)
    window.setTimeout(() => {
      setIsLoading(false)
      setShowResult(true)
    }, 1500)
  }

  const copyRichEmail = async (html: string, plain: string) => {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ])
        return
      }
    } catch {
      // fall through to plain
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain)
      return
    }
    const ta = document.createElement('textarea')
    ta.value = plain
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (!ok) throw new Error('copy failed')
  }

  const handleCopyEmailDraft = async (
    carrier: (typeof quotes)[number],
  ) => {
    const { html, plain } = buildCarrierEmailDraft({
      origin,
      destination,
      length: cargo.length,
      width: cargo.width,
      height: cargo.height,
      weight: Number(cargo.weight),
      cw,
      carrier,
      validUntil: quoteValidUntil,
    })
    try {
      await copyRichEmail(html, plain)
      setCopied(carrier.code)
      setToast('????? ??????? ??????Outlook???????')
      window.setTimeout(() => {
        setCopied('')
        setToast('')
      }, 2200)
    } catch {
      setToast('????? ?????????????.')
      window.setTimeout(() => setToast(''), 2200)
    }
  }

  /** Shipper CTA: open mail to WAC with inquiry (not desk paste) */
  const handleRequestQuote = (carrier: (typeof quotes)[number]) => {
    const subject = encodeURIComponent(
      `[Quote Request] ${origin}-${destination} / ${carrier.code} / ${cw.toFixed(1)}KGS`,
    )
    const body = encodeURIComponent(
      `Hello WAC Logistics,\n\nI would like an official quote for the below shipment.\n\nLane: ${origin} ??${destination}\nDims: ${cargo.length} x ${cargo.width} x ${cargo.height} cm\nGross: ${Number(cargo.weight).toFixed(1)} KGS\nC.W.: ${cw.toFixed(1)} KGS\nPreferred carrier: ${carrier.code} (${carrier.name})\nIndicative air total (web): USD ${carrier.total.toFixed(2)}\n\nPlease confirm allotment, final rate, origin local & trucking, and transit.\n\nThank you.`,
    )
    window.location.href = `mailto:service@waclogistics.com?subject=${subject}&body=${body}`
  }

  const handleCopyCmDesk = async () => {
    if (!cmDeskQuote) return
    const plain = buildCmDeskPlainTable(cmDeskQuote)
    try {
      await copyRichEmail(
        `<pre style="font-family:Calibri">${plain.replace(/\n/g, '<br/>')}</pre>`,
        plain,
      )
      setCopied('desk')
      setToast('Excel-style cost table copied')
      window.setTimeout(() => {
        setCopied('')
        setToast('')
      }, 2400)
    } catch {
      setToast('????? ?????????????.')
      window.setTimeout(() => setToast(''), 2200)
    }
  }

  const handlePrintCmDeskPdf = () => {
    if (!cmDeskQuote) return
    printCmDeskQuote({
      origin,
      destination,
      cargoSummary: `${cargo.length} x ${cargo.width} x ${cargo.height} cm / 1 pcs / ${Number(cargo.weight).toFixed(1)} kg`,
      carrierCode: deskCarrier,
      remark: deskRemark,
      quote: cmDeskQuote,
      exceptionDraft: cmExceptionDraft,
    })
    setToast('Save as PDF in the print dialog')
    window.setTimeout(() => setToast(''), 2800)
  }

  const openDesk = () => {
    setQuoteMode('desk')
    if (!showResult) handleCalculate()
  }

  return (
    <div className="min-h-screen bg-white font-sans text-wac-navy">
      <SiteHeader />

      {/* INSTANT QUOTE ??Excel Master backend */}
      <section
        id="quote"
        className="quote-dashboard border-t border-slate-200/80 pt-24 pb-16 sm:pt-28 sm:pb-20"
      >
        <div id="desk" className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <Reveal>
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-[11px] font-bold tracking-[0.22em] text-wac-orange uppercase">
                Digital freight desk
              </p>
              <h2 className="font-display text-3xl font-extrabold text-wac-navy sm:text-4xl lg:text-[42px]">
                {quoteMode === 'public'
                  ? 'Instant Air Quote'
                  : 'Origin Cost Desk'}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                {quoteMode === 'public'
                  ? 'Indicative air from Excel Master_DB ??chargeable weight and carrier compare.'
                  : 'CM Excel ???????? ??Master ?? + ??? + Other ??TOTAL + PDF.'}
              </p>
            </div>
            <div className="inline-flex rounded-md border border-slate-200/90 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setQuoteMode('public')}
                className={`rounded px-4 py-2 text-[12px] font-bold transition ${
                  quoteMode === 'public'
                    ? 'bg-wac-navy text-white'
                    : 'text-slate-500 hover:text-wac-navy'
                }`}
              >
                Public Quote
              </button>
              <button
                type="button"
                onClick={() => openDesk()}
                className={`inline-flex items-center gap-1.5 rounded px-4 py-2 text-[12px] font-bold transition ${
                  quoteMode === 'desk'
                    ? 'bg-wac-orange text-white'
                    : 'text-slate-500 hover:text-wac-navy'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                WAC Desk
              </button>
            </div>
          </div>

          {/* KPI strip ??Desk dashboard chrome only (Public has its own quote card) */}
          <div
            className={`mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4 ${
              quoteMode === 'public' ? 'hidden' : ''
            }`}
          >
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Route
              </p>
              <p className="mt-0.5 font-display text-lg font-extrabold text-wac-navy">
                {origin || '--'} {'?'} {destination || '--'}
              </p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Chargeable wt
              </p>
              <p className="mt-0.5 font-display text-lg font-extrabold text-emerald-700">
                {cw > 0 ? `${deskCw.toFixed(1)} KGS` : '--'}
              </p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {quoteMode === 'desk' ? 'Formal total' : 'Best indicative'}
              </p>
              <p className="mt-0.5 font-display text-lg font-extrabold text-wac-navy">
                {quoteMode === 'desk' && cmDeskQuote && showResult
                  ? `${cmDeskQuote.currency} ${cmDeskQuote.total.toFixed(0)}`
                  : showResult && bestPublic
                    ? `USD ${bestPublic.total.toFixed(0)}`
                    : cmQuote
                      ? `USD ${cmQuote.total.toFixed(0)}`
                      : '--'}
              </p>
            </div>
            <div className="bg-wac-navy px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-white/50 uppercase">
                TOTAL APPX
              </p>
              <p className="mt-0.5 font-display text-lg font-extrabold text-wac-orange">
                {quoteMode === 'desk' && cmDeskQuote && showResult
                  ? `${cmDeskQuote.currency} ${cmDeskQuote.total.toFixed(2)}`
                  : showResult && bestPublic
                    ? `USD ${bestPublic.total.toFixed(2)}`
                    : cmQuote
                      ? `USD ${cmQuote.total.toFixed(2)}`
                      : 'Calculate'}
              </p>
            </div>
          </div>
          </Reveal>

          <Reveal delay={120}>
          {quoteMode === 'public' ? (
            <PublicQuoteDHL
              origin={origin}
              destination={destination}
              setOrigin={setOrigin}
              setDestination={setDestination}
              cargo={cargo}
              updateCargo={updateCargo}
              setCargo={setCargo}
              cw={cw}
              volWeight={volWeight}
              showResult={showResult}
              isLoading={isLoading}
              formError={formError}
              handleCalculate={handleCalculate}
              quotes={quotes}
              bestPublic={bestPublic}
              quoteValidUntil={quoteValidUntil}
              copied={copied}
              handleRequestQuote={(c) => {
                const full = quotes.find((q) => q.code === c.code)
                if (full) handleRequestQuote(full)
              }}
              handleCopyEmailDraft={(c) => {
                const full = quotes.find((q) => q.code === c.code)
                if (full) void handleCopyEmailDraft(full)
              }}
              openDesk={openDesk}
              setDeskCarrier={setDeskCarrier}
              cmQuote={
                cmQuote
                  ? {
                      total: cmQuote.total,
                      route: cmQuote.route,
                      breakLabel: cmQuote.breakLabel,
                      cw: cmQuote.cw,
                    }
                  : null
              }
            />
          ) : (
          <div className="grid grid-cols-12 gap-5 lg:gap-6">
            <div className="col-span-12 lg:col-span-4">
              <div className="rounded-lg border border-slate-200/90 bg-white/95 p-5 shadow-sm backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Box className="h-5 w-5 text-wac-orange" />
                  <h3 className="text-[15px] font-bold text-wac-navy">
                    Cargo input
                  </h3>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-[45%]">
                      <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Origin
                      </label>
                      <input
                        type="text"
                        value={origin}
                        maxLength={3}
                        onChange={(e) =>
                          setOrigin(e.target.value.toUpperCase())
                        }
                        placeholder="SIN"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold uppercase tracking-wider text-slate-700 outline-none transition focus:border-wac-orange focus:ring-1 focus:ring-wac-orange"
                      />
                    </div>
                    <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-slate-300" />
                    <div className="w-[45%]">
                      <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Destination
                      </label>
                      <input
                        type="text"
                        value={destination}
                        maxLength={3}
                        onChange={(e) =>
                          setDestination(e.target.value.toUpperCase())
                        }
                        placeholder="HKG"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold uppercase tracking-wider text-slate-700 outline-none transition focus:border-wac-orange focus:ring-1 focus:ring-wac-orange"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        ['length', 'L (cm)'],
                        ['width', 'W (cm)'],
                        ['height', 'H (cm)'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                          {label}
                        </label>
                        <input
                          type="number"
                          value={cargo[key]}
                          onChange={(e) => updateCargo(key, e.target.value)}
                          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none transition focus:border-wac-orange focus:ring-1 focus:ring-wac-orange"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Gross Weight (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={cargo.weight}
                        onChange={(e) => updateCargo('weight', e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm font-medium outline-none transition focus:border-wac-orange focus:ring-1 focus:ring-wac-orange"
                      />
                      <span className="absolute top-3 right-3 text-sm font-medium text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  {quoteMode === 'desk' && (
                    <div className="space-y-3 rounded-lg border border-orange-100 bg-orange-50/60 p-4">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-wac-orange" />
                        <p className="text-[11px] font-bold tracking-wider text-wac-orange uppercase">
                          Excel ??? (cargo meta)
                        </p>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        Route??? ??? ??Calculate. ?? ??????Other???????                        ?????Excel J????????.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Qty (pcs)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={cmQty}
                            onChange={(e) =>
                              setCmQty(Math.max(1, Number(e.target.value) || 1))
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-wac-orange"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            BL count
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={blCount}
                            onChange={(e) =>
                              setBlCount(Math.max(1, Number(e.target.value) || 1))
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-wac-orange"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          Carrier
                        </label>
                        <input
                          type="text"
                          value={deskCarrier}
                          onChange={(e) => setDeskCarrier(e.target.value.toUpperCase())}
                          placeholder="KE"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold uppercase outline-none focus:border-wac-orange"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          Remark (PDF)
                        </label>
                        <input
                          type="text"
                          value={deskRemark}
                          onChange={(e) => setDeskRemark(e.target.value)}
                          placeholder="KEEP COOL / 2-8?C"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-wac-orange"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          Ex. Rate (HKD lanes)
                        </label>
                        <input
                          type="number"
                          min={0.0001}
                          step={0.0001}
                          value={cmFxRate}
                          onChange={(e) => setCmFxRate(Number(e.target.value) || 1)}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-wac-orange"
                        />
                        <p className="mt-1 text-[10px] text-slate-400">
                          Excel C34 ??HKD ???? 1.0, USD??HKD ???????? ???
                        </p>
                      </div>
                    </div>
                  )}

                  {quoteMode === 'desk' && cmMaster && (
                    <details className="rounded-lg border border-slate-200 bg-white" open>
                      <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-bold tracking-wider text-wac-navy uppercase">
                        Master_DB ??? (??????? ???)
                      </summary>
                      <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                        <CmMasterEditor
                          master={cmMaster}
                          onChange={(next) => {
                            setCmMaster(next)
                            setCmImportMsg('Master edited in browser (session)')
                          }}
                        />
                      </div>
                    </details>
                  )}

                  {quoteMode === 'desk' && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-wac-navy" />
                        <p className="text-[11px] font-bold tracking-wider text-wac-navy uppercase">
                          xlsx Import / Download
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="/excel/WAC_Air_Quotation_Simulator.xlsx"
                          download
                          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:border-wac-orange"
                        >
                          Download Excel
                        </a>
                        <button
                          type="button"
                          onClick={() => cmFileRef.current?.click()}
                          className="inline-flex h-9 items-center rounded-lg bg-wac-navy px-3 text-[11px] font-bold text-white hover:bg-[#243447]"
                        >
                          Import Master_DB
                        </button>
                        <input
                          ref={cmFileRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (!file) return
                            void (async () => {
                              try {
                                const master = await parseCmMasterFile(file)
                                setCmMaster(master)
                                setCmImportMsg(
                                  `Loaded ${master.air.length} routes ? ${master.local.length} local lines`,
                                )
                                setToast('CM Excel Master imported')
                              } catch (err) {
                                setCmImportMsg(
                                  err instanceof Error
                                    ? err.message
                                    : 'Import failed',
                                )
                              }
                            })()
                          }}
                        />
                      </div>
                      {cmImportMsg && (
                        <p className="mt-2 text-[11px] text-slate-600">{cmImportMsg}</p>
                      )}
                      {cmMaster && (
                        <p className="mt-2 text-[11px] font-semibold text-wac-navy">
                          {cmMaster.air.length} routes ? {cmMaster.local.length} local
                          charges
                        </p>
                      )}
                    </div>
                  )}

                  {formError && (
                    <p className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-600">
                      {formError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCalculate}
                    disabled={isLoading}
                    className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wac-orange text-sm font-bold text-white shadow-lg shadow-[#F05023]/25 transition hover:bg-[#d9441c] disabled:cursor-wait disabled:opacity-90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="spinner h-4 w-4" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        {quoteMode === 'desk'
                          ? 'Calculate Formal Cost'
                          : 'Calculate Quote'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
        </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
              {isLoading ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
                  <Loader2 className="spinner mb-4 h-10 w-10 text-wac-orange" />
                  <h4 className="mb-1 text-lg font-bold text-slate-700">
                    {quoteMode === 'desk'
                      ? 'Building origin cost sheet...'
                      : 'Fetching live rates from carriers...'}
                  </h4>
                  <p className="max-w-sm text-center text-sm text-slate-500">
                    {quoteMode === 'desk'
                      ? 'Reading Master_DB ??Air + local + Other rows'
                      : `Querying WAC major airlines for ${origin} ??${destination} (mock rates until CargoAI / rate DB).`}
                  </p>
                </div>
              ) : !showResult ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-12">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Plane className="h-8 w-8 text-slate-300" />
                  </div>
                  <h4 className="mb-1 text-lg font-bold text-slate-700">
                    Ready for Quote
                  </h4>
                  <p className="max-w-sm text-center text-sm text-slate-500">
                    Enter origin, destination, dimensions and weight to compare
                    12 WAC major carriers instantly.
                  </p>
                </div>
              ) : showResult ? (
                <CmDeskQuotePanel
                  master={cmMaster}
                  quote={cmDeskQuote}
                  origin={origin}
                  destination={destination}
                  exceptionDraft={cmExceptionDraft}
                  otherLabels={cmOtherLabels}
                  otherUnits={cmOtherUnits}
                  extraOthers={cmExtraOthers}
                  onExceptionChange={(id, value) =>
                    setCmExceptionDraft((d) => ({ ...d, [id]: value }))
                  }
                  onOtherLabelChange={(id, value) =>
                    setCmOtherLabels((l) => ({ ...l, [id]: value }))
                  }
                  onOtherUnitChange={(id, value) =>
                    setCmOtherUnits((u) => ({ ...u, [id]: value }))
                  }
                  onAddExtraOther={() =>
                    setCmExtraOthers((rows) => [
                      ...rows,
                      {
                        id: `extra-${Date.now()}`,
                        label: 'Other',
                        unit: 'Manual',
                      },
                    ])
                  }
                  onRemoveExtraOther={(id) => {
                    setCmExtraOthers((rows) => rows.filter((r) => r.id !== id))
                    setCmExceptionDraft((d) => {
                      const next = { ...d }
                      delete next[id]
                      return next
                    })
                  }}
                  onExtraOtherChange={(id, patch) =>
                    setCmExtraOthers((rows) =>
                      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
                    )
                  }
                  onCopy={() => void handleCopyCmDesk()}
                  onPrint={handlePrintCmDeskPdf}
                  copied={copied === 'desk'}
                />
              ) : (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-12">
                  <Plane className="mb-4 h-8 w-8 text-slate-300" />
                  <h4 className="mb-1 text-lg font-bold text-slate-700">
                    Ready for Excel desk quote
                  </h4>
                  <p className="max-w-sm text-center text-sm text-slate-500">
                    Enter route and cargo, then Calculate.
                  </p>
                </div>
              )}
            </div>
          </div>
          )}
          </Reveal>
        </div>
      </section>

      <SiteFooter />

      {toast && (
        <div className="toast-in fixed bottom-5 left-1/2 z-50 rounded-lg bg-wac-navy px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quote" element={<QuoteWorkspace />} />
      <Route path="/origin-cost-desk" element={<OriginCostDeskSite />} />
      <Route path="/track" element={<TrackPage />} />
      <Route path="/desk" element={<Navigate to="/quote?mode=desk" replace />} />
    </Routes>
  )
}
