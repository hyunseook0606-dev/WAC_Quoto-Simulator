import { useEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Loader2, Pin, Plus, Search, Trash2 } from 'lucide-react'
import { CmMasterEditor } from './components/CmMasterEditor'
import {
  calcCmDeskQuote,
  parseCmExceptions,
  type CmCargoPiece,
} from './cmDeskQuote'
import {
  isPersistedMaster,
  normalizeMaster,
  parseCmMasterFromWorkbook,
  parseCmMasterFile,
  type CmMaster,
} from './cmExcelMaster'
import { filterLinesForPdf } from './cmDeskPdf'
import { buildCmDeskPlainTable, buildCmDeskQuotationHtml } from './cmDeskDocument'
import { printQuotation } from '../quoteDocument'
import { type CmExtraOther } from './cmDeskConfig'
import { addAirRoute } from './cmMasterEdit'

type TabKey = 'master' | 'input' | 'quote'
type CargoPieceDraft = {
  id: string
  length: string
  width: string
  height: string
  qty: string
  gross: string
}

type QuoteHistoryItem = {
  id: string
  createdAt: string
  consignee: string
  origin: string
  destination: string
  cargoPieces: CargoPieceDraft[]
  blCount: number
  fxDraft: string
  carrierCode: string
  deskRemark: string
  exceptionDraft: Record<string, string>
  otherLabels: Record<string, string>
  otherUnits: Record<string, string>
  extraOthers: CmExtraOther[]
  disabledFixedOtherIds: string[]
  refDraft?: Record<string, string>
  // Snapshot of computed values (for list display + quick filters)
  currency: 'USD' | 'HKD'
  total: number
  cw: number
  cbm: number
  breakLabel: string
  savedPdfHtml?: string
  pinned?: boolean
  caseName?: string
}

type QuoteDraft = {
  updatedAt: string
  consignee: string
  origin: string
  destination: string
  cargoPieces: CargoPieceDraft[]
  blCountDraft: string
  fxDraft: string
  carrierCode: string
  deskRemark: string
  exceptionDraft: Record<string, string>
  otherLabels: Record<string, string>
  otherUnits: Record<string, string>
  extraOthers: CmExtraOther[]
  disabledFixedOtherIds: string[]
  refDraft: Record<string, string>
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cargoDimsText(pieces: CargoPieceDraft[]): string {
  return pieces
    .filter((p) => p.length && p.width && p.height)
    .map(
      (p) =>
        `${p.length}×${p.width}×${p.height}${p.qty ? `/${p.qty}pcs` : ''}${
          p.gross ? ` ${p.gross}kg` : ''
        }`,
    )
    .join(' · ')
}

function historySearchBlob(item: QuoteHistoryItem): string {
  return [
    item.consignee,
    item.origin,
    item.destination,
    `${item.origin}-${item.destination}`,
    item.carrierCode,
    item.deskRemark,
    item.caseName,
    item.breakLabel,
    item.currency,
    String(item.total),
    cargoDimsText(item.cargoPieces),
  ]
    .join(' ')
    .toUpperCase()
}

function caseFingerprint(item: {
  consignee: string
  origin: string
  destination: string
  cargoPieces: CargoPieceDraft[]
  exceptionDraft: Record<string, string>
  deskRemark: string
  extraOthers: CmExtraOther[]
}): string {
  return [
    item.consignee.trim().toUpperCase(),
    item.origin,
    item.destination,
    cargoDimsText(item.cargoPieces),
    JSON.stringify(item.exceptionDraft),
    item.deskRemark.trim().toUpperCase(),
    item.extraOthers.map((row) => row.label).join(','),
  ].join('|')
}

function defaultCaseName(item: {
  consignee: string
  origin: string
  destination: string
  deskRemark: string
}): string {
  const remark = item.deskRemark.trim()
  const bits = [
    item.consignee.trim(),
    remark ? remark.slice(0, 28) : '',
    `${item.origin}-${item.destination}`,
  ].filter(Boolean)
  return bits.join(' · ')
}

export function OriginCostDeskSite() {
  const [tab, setTab] = useState<TabKey>('master')

  const [master, setMaster] = useState<CmMaster | null>(null)
  const cmFileRef = useRef<HTMLInputElement>(null)
  const [cmImportMsg, setCmImportMsg] = useState('')

  const [origin, setOrigin] = useState('HKG')
  const [destination, setDestination] = useState('ICN')
  const [consignee, setConsignee] = useState('')
  const [lengthDraft] = useState('110')
  const [widthDraft] = useState('110')
  const [heightDraft] = useState('109')
  const [weightDraft] = useState('194.5')
  const [qtyDraft] = useState('1')
  const [blCountDraft, setBlCountDraft] = useState('1')
  const CARGO_DETAIL_SLOTS = 10
  const [cargoPieces, setCargoPieces] = useState<CargoPieceDraft[]>(
    () =>
      Array.from({ length: CARGO_DETAIL_SLOTS }, (_, i) => ({
        id: `piece-${i + 1}`,
        length: i === 0 ? '110' : '',
        width: i === 0 ? '110' : '',
        height: i === 0 ? '109' : '',
        qty: i === 0 ? '1' : '',
        gross: i === 0 ? '194.5' : '',
      })),
  )

  // Excel: TOTAL × Ex.Rate when Currency is HKD; USD TOTAL is unchanged.
  const [fxDraft, setFxDraft] = useState('1')

  const [carrierCode, setCarrierCode] = useState('KE')
  const [deskRemark, setDeskRemark] = useState('')
  const [exceptionDraft, setExceptionDraft] = useState<Record<string, string>>(
    {},
  )
  const [otherLabels, setOtherLabels] = useState<Record<string, string>>({})
  const [otherUnits, setOtherUnits] = useState<Record<string, string>>({})

  // Optional extra Other rows (Master 로컬 항목 외 수기 추가)
  const [extraOthers, setExtraOthers] = useState<CmExtraOther[]>([])
  const [disabledFixedOtherIds, setDisabledFixedOtherIds] = useState<string[]>(
    [],
  )
  const [refDraft, setRefDraft] = useState<Record<string, string>>({})

  const HISTORY_KEY = 'origin-cost-desk.quote-history.v1'
  const DRAFT_KEY = 'origin-cost-desk.draft.v1'
  const MASTER_KEY = 'origin-cost-desk.master.v2'
  const [quoteHistory, setQuoteHistory] = useState<QuoteHistoryItem[]>([])
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyShowAdvanced, setHistoryShowAdvanced] = useState(false)
  const [historySameRoute, setHistorySameRoute] = useState(false)
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [historyMinTotal, setHistoryMinTotal] = useState('')
  const [historyMaxTotal, setHistoryMaxTotal] = useState('')
  const [historyMinGross, setHistoryMinGross] = useState('')
  const [historyMaxGross, setHistoryMaxGross] = useState('')
  const [historyUseCurrentSize, setHistoryUseCurrentSize] = useState(false)
  const [historySizeTolerance, setHistorySizeTolerance] = useState('20')
  const [loadedHistoryPdfHtml, setLoadedHistoryPdfHtml] = useState('')
  const [historyNotice, setHistoryNotice] = useState<{
    kind: 'reuse' | 'open'
    text: string
  } | null>(null)
  const [caseNameDraft, setCaseNameDraft] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const historyHydratedRef = useRef(false)
  const draftHydratedRef = useRef(false)
  const masterHydratedRef = useRef(false)

  const [routePickerOpen, setRoutePickerOpen] = useState(false)
  const routePickerWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem(MASTER_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as unknown
          if (isPersistedMaster(parsed)) {
            const saved = normalizeMaster(parsed)
            setMaster(saved)
            setCmImportMsg(
              `Master loaded from this browser · ${saved.air.length} routes · edit yellow cells anytime`,
            )
            masterHydratedRef.current = true
            return
          }
        }
      } catch {
        // fall through to bundled Excel default
      }
      try {
        const res = await fetch('/excel/WAC_Air_Quotation_Simulator.xlsx')
        if (!res.ok) return
        const buf = await res.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const next = normalizeMaster(
          parseCmMasterFromWorkbook(wb, 'WAC_Air_Quotation_Simulator.xlsx'),
        )
        setMaster(next)
        setCmImportMsg(
          'Default Master from Excel — yellow cells are editable; changes stay in this browser',
        )
      } catch {
        // ignore
      } finally {
        masterHydratedRef.current = true
      }
    })()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as QuoteHistoryItem[]
      if (Array.isArray(parsed)) setQuoteHistory(parsed)
    } catch {
      // ignore
    } finally {
      historyHydratedRef.current = true
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as QuoteDraft
      if (!d || !d.cargoPieces) return
      setConsignee(d.consignee ?? '')
      setOrigin(d.origin ?? 'HKG')
      setDestination(d.destination ?? 'ICN')
      const loaded = (d.cargoPieces ?? []).slice(0, CARGO_DETAIL_SLOTS)
      const nextPieces: CargoPieceDraft[] = Array.from(
        { length: CARGO_DETAIL_SLOTS },
        (_, i) =>
          loaded[i] ?? {
            id: `piece-${i + 1}`,
            length: '',
            width: '',
            height: '',
            qty: '',
            gross: '',
          },
      )
      setCargoPieces(nextPieces)
      setBlCountDraft(d.blCountDraft ?? '1')
      setFxDraft(d.fxDraft ?? '1')
      setCarrierCode(d.carrierCode ?? 'KE')
      setDeskRemark(d.deskRemark ?? '')
      setExceptionDraft({ ...(d.exceptionDraft ?? {}) })
      setOtherLabels({ ...(d.otherLabels ?? {}) })
      setOtherUnits({ ...(d.otherUnits ?? {}) })
      setExtraOthers(d.extraOthers ?? [])
      setDisabledFixedOtherIds(d.disabledFixedOtherIds ?? [])
      setRefDraft({ ...(d.refDraft ?? {}) })
      setTab('input')
    } catch {
      // ignore
    } finally {
      draftHydratedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!historyHydratedRef.current) return
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(quoteHistory))
    } catch {
      // ignore
    }
  }, [quoteHistory])

  useEffect(() => {
    if (!masterHydratedRef.current || !master) return
    try {
      localStorage.setItem(MASTER_KEY, JSON.stringify(master))
    } catch {
      // ignore
    }
  }, [master])

  useEffect(() => {
    if (!draftHydratedRef.current) return
    const t = window.setTimeout(() => {
      try {
        const draft: QuoteDraft = {
          updatedAt: new Date().toISOString(),
          consignee,
          origin,
          destination,
          cargoPieces,
          blCountDraft,
          fxDraft,
          carrierCode,
          deskRemark,
          exceptionDraft,
          otherLabels,
          otherUnits,
          extraOthers,
          disabledFixedOtherIds,
          refDraft,
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } catch {
        // ignore
      }
    }, 600)

    return () => window.clearTimeout(t)
  }, [
    consignee,
    origin,
    destination,
    cargoPieces,
    blCountDraft,
    fxDraft,
    carrierCode,
    deskRemark,
    exceptionDraft,
    otherLabels,
    otherUnits,
    extraOthers,
    disabledFixedOtherIds,
    refDraft,
  ])

  useEffect(() => {
    if (!routePickerOpen) return
    const onDown = (e: MouseEvent) => {
      const el = e.target as Node | null
      if (!el) return
      if (routePickerWrapRef.current?.contains(el)) return
      setRoutePickerOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [routePickerOpen])

  const length = Number(lengthDraft) || 0
  const width = Number(widthDraft) || 0
  const height = Number(heightDraft) || 0
  const weight = Number(weightDraft) || 0
  const qty = Math.max(1, Number(qtyDraft) || 1)
  const blCount = Math.max(1, Number(blCountDraft) || 1)
  const fx = Number(fxDraft) || 1
  const normalizedCargoPieces: CmCargoPiece[] = cargoPieces
    .map((piece) => ({
      length: Number(piece.length) || 0,
      width: Number(piece.width) || 0,
      height: Number(piece.height) || 0,
      qty: Math.max(0, Number(piece.qty) || 0),
      gross: Number(piece.gross) || 0,
    }))
    .filter(
      (piece) =>
        piece.length > 0 &&
        piece.width > 0 &&
        piece.height > 0 &&
        piece.qty > 0 &&
        piece.gross > 0,
    )
  const pieceMetrics = cargoPieces.map((piece) => {
    const lengthValue = Number(piece.length) || 0
    const widthValue = Number(piece.width) || 0
    const heightValue = Number(piece.height) || 0
    const qtyValue = Math.max(0, Number(piece.qty) || 0)
    const grossValue = Number(piece.gross) || 0
    return {
      ...piece,
      lengthValue,
      widthValue,
      heightValue,
      qtyValue,
      grossValue,
      cbmValue:
        (lengthValue * widthValue * heightValue * qtyValue) / 1_000_000,
      cwValue: Math.max(
        grossValue,
        ((lengthValue * widthValue * heightValue * qtyValue) / 1_000_000) * 167,
      ),
    }
  })
  const detailQty = normalizedCargoPieces.reduce((sum, piece) => sum + piece.qty, 0)
  const detailGross = normalizedCargoPieces.reduce((sum, piece) => sum + piece.gross, 0)
  const detailCbm = normalizedCargoPieces.reduce(
    (sum, piece) =>
      sum + (piece.length * piece.width * piece.height * piece.qty) / 1_000_000,
    0,
  )
  const usingDetailedCargo = normalizedCargoPieces.length > 0
  const cargoQty = usingDetailedCargo ? detailQty : qty
  const cargoGross = usingDetailedCargo ? detailGross : weight
  const cargoCbm = usingDetailedCargo
    ? detailCbm
    : (length * width * height * qty) / 1_000_000
  const cargoSummary = usingDetailedCargo
    ? normalizedCargoPieces
        .map(
          (piece, index) =>
            `${index + 1}) ${piece.length} x ${piece.width} x ${piece.height} cm / ${piece.qty} pcs / ${piece.gross.toFixed(1)} kg`,
        )
        .join(' ; ')
    : `${length} x ${width} x ${height} cm / ${qty} pcs / ${weight.toFixed(1)} kg`

  const deskQuote = useMemo(() => {
    if (!master) return null
    return calcCmDeskQuote(master, {
      origin,
      destination,
      length,
      width,
      height,
      qty,
      gross: weight,
      pieces: normalizedCargoPieces,
      blCount,
      fx,
      exceptions: parseCmExceptions(exceptionDraft),
      refOverrides: parseCmExceptions(refDraft),
      otherLabels,
      otherUnits,
      extraOthers,
      disabledLineIds: disabledFixedOtherIds,
    })
  }, [
    master,
    origin,
    destination,
    length,
    width,
    height,
    qty,
    weight,
    blCount,
    fx,
    normalizedCargoPieces,
    exceptionDraft,
    refDraft,
    otherLabels,
    otherUnits,
    extraOthers,
    disabledFixedOtherIds,
  ])

  const pdfLines = useMemo(() => {
    if (!deskQuote) return []
    return filterLinesForPdf(deskQuote.lines, exceptionDraft)
  }, [deskQuote, exceptionDraft])

  const handleCalculate = () => {
    if (!origin || !destination) return
    if (!master) return
    setIsLoading(true)
    window.setTimeout(() => {
      setIsLoading(false)
      setTab('input')
    }, 350)
  }

  const addOtherRow = () => {
    setExtraOthers((rows) => [
      ...rows,
      {
        id: `extra-${Date.now()}-${rows.length}`,
        label: 'Other',
        unit: 'Manual',
      },
    ])
  }

  const focusCell = (cellId: string) => {
    const el = cellRefs.current[cellId]
    if (!el) return
    el.focus()
    el.select()
  }

  const handleCellNav = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    nav: {
      enter?: string
      up?: string
      down?: string
      left?: string
      right?: string
    },
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (nav.enter) focusCell(nav.enter)
      return
    }
    if (event.key === 'ArrowUp' && nav.up) {
      event.preventDefault()
      focusCell(nav.up)
      return
    }
    if (event.key === 'ArrowDown' && nav.down) {
      event.preventDefault()
      focusCell(nav.down)
      return
    }
    if (event.key === 'ArrowLeft' && nav.left) {
      event.preventDefault()
      focusCell(nav.left)
      return
    }
    if (event.key === 'ArrowRight' && nav.right) {
      event.preventDefault()
      focusCell(nav.right)
    }
  }

  const handleCargoPaste =
    (startIndex: number) =>
    (event: ReactClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData('text') ?? ''
      const matches =
        text.match(/-?\d+(?:\.\d+)?/g)?.map((s) => Number(s)) ?? []

      // Expect: [L, W, H, Qty, Gross] per slot
      if (matches.length < 5) return

      // Keep it Excel-like: paste should replace the draft values.
      event.preventDefault()
      setCargoPieces((rows) => {
        const next = rows.map((r) => ({ ...r }))
        let slot = startIndex

        for (let i = 0; i + 4 < matches.length && slot < next.length; i += 5) {
          const L = Math.max(0, matches[i])
          const W = Math.max(0, matches[i + 1])
          const H = Math.max(0, matches[i + 2])
          const Q = Math.max(0, matches[i + 3])
          const GW = Math.max(0, matches[i + 4])

          // Basic "is empty slot" check: if L/W/H/Q/GW are all 0, stop.
          if (L === 0 && W === 0 && H === 0 && Q === 0 && GW === 0) break

          next[slot] = {
            ...next[slot],
            length: String(L),
            width: String(W),
            height: String(H),
            qty: String(Q),
            gross: String(GW),
          }

          slot++
        }

        return next
      })
    }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        handleCalculate()
        return
      }
      if (event.altKey && event.key === '1') {
        event.preventDefault()
        setTab('master')
        return
      }
      if (event.altKey && event.key === '2') {
        event.preventDefault()
        setTab('input')
        return
      }
      if (event.altKey && event.key === '3') {
        event.preventDefault()
        setTab('quote')
        return
      }
      if (event.altKey && (event.key === 'o' || event.key === 'O') && tab === 'input') {
        event.preventDefault()
        addOtherRow()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tab, master, origin, destination])

  const copyTable = async () => {
    if (!deskQuote) return
    const plain = buildCmDeskPlainTable(deskQuote)
    const html = `
      <table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:13px;min-width:560px">
        <thead>
          <tr>
            <th style="background:#243447;color:#fff;border:1px solid #cbd5e1;padding:8px 10px;text-align:left">Charge</th>
            <th style="background:#243447;color:#fff;border:1px solid #cbd5e1;padding:8px 10px;text-align:left">Unit</th>
            <th style="background:#243447;color:#fff;border:1px solid #cbd5e1;padding:8px 10px;text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${pdfLines
            .map(
              (line) => `<tr>
                <td style="border:1px solid #cbd5e1;padding:7px 10px;font-weight:600;color:#1e293b">${esc(line.label)}</td>
                <td style="border:1px solid #cbd5e1;padding:7px 10px;color:#64748b">${esc(line.unit)}</td>
                <td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-weight:700">${deskQuote.currency} ${line.amount.toFixed(2)}</td>
              </tr>`,
            )
            .join('')}
          <tr>
            <td colspan="2" style="background:#F05023;color:#fff;border:1px solid #F05023;padding:9px 10px;text-align:right;font-weight:800">TOTAL APPX. AMOUNT</td>
            <td style="background:#fff7ed;color:#1e293b;border:1px solid #F05023;padding:9px 10px;text-align:right;font-weight:800">${deskQuote.currency} ${deskQuote.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    `
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
      await navigator.clipboard.writeText(plain)
    } catch {
      // fallback: ignore
    }
  }

  const printPdf = () => {
    if (!deskQuote) return

    const cargoSlotsForPdf = cargoPieces.map((p, i) => {
      const L = Number(p.length) || 0
      const W = Number(p.width) || 0
      const H = Number(p.height) || 0
      const Q = Number(p.qty) || 0
      const GW = Number(p.gross) || 0

      const has =
        L > 0 && W > 0 && H > 0 && Q > 0 && Number.isFinite(GW) && GW > 0

      if (!has) {
        return {
          index: i + 1,
          dimensionsText: '',
          qtyText: '',
          grossText: '',
          cbmText: '',
          cwText: '',
        }
      }

      const cbm = (L * W * H * Q) / 1_000_000
      const cw = Math.max(GW, cbm * 167)

      // Excel PDF shows Gross as rounded (e.g. 194.5 → 195)
      return {
        index: i + 1,
        dimensionsText: `${Math.round(L)} x ${Math.round(W)} x ${Math.round(H)}`,
        qtyText: `${Q}`,
        grossText: `${Math.round(GW)}`,
        cbmText: cbm.toFixed(3),
        cwText: cw.toFixed(2),
      }
    })

    const html = buildCmDeskQuotationHtml({
      origin,
      destination,
      consignee,
      cargoSummary,
      carrierCode,
      remark: deskRemark,
      quote: deskQuote,
      exceptionDraft,
      blCount,
      cargoSlots: cargoSlotsForPdf,
    })
    printQuotation(html)
    saveQuoteToHistory({ auto: true })
  }

  const saveQuoteToHistory = (opts?: { auto?: boolean; pin?: boolean }) => {
    if (!deskQuote) return

    const cargoSlotsForPdf = cargoPieces.map((p, i) => {
      const L = Number(p.length) || 0
      const W = Number(p.width) || 0
      const H = Number(p.height) || 0
      const Q = Number(p.qty) || 0
      const GW = Number(p.gross) || 0

      const has =
        L > 0 && W > 0 && H > 0 && Q > 0 && Number.isFinite(GW) && GW > 0

      if (!has) {
        return {
          index: i + 1,
          dimensionsText: '',
          qtyText: '',
          grossText: '',
          cbmText: '',
          cwText: '',
        }
      }

      const cbm = (L * W * H * Q) / 1_000_000
      const cw = Math.max(GW, cbm * 167)

      return {
        index: i + 1,
        dimensionsText: `${Math.round(L)} x ${Math.round(W)} x ${Math.round(H)}`,
        qtyText: `${Q}`,
        grossText: `${Math.round(GW)}`,
        cbmText: cbm.toFixed(3),
        cwText: cw.toFixed(2),
      }
    })

    const savedPdfHtml = buildCmDeskQuotationHtml({
      origin,
      destination,
      consignee,
      cargoSummary,
      carrierCode,
      remark: deskRemark,
      quote: deskQuote,
      exceptionDraft,
      blCount,
      cargoSlots: cargoSlotsForPdf,
    })

    const name =
      caseNameDraft.trim() ||
      defaultCaseName({
        consignee,
        origin,
        destination,
        deskRemark,
      })

    const item: QuoteHistoryItem = {
      id: `qh-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      consignee,
      origin,
      destination,
      cargoPieces: cargoPieces.map((p) => ({ ...p })),
      blCount,
      fxDraft,
      carrierCode,
      deskRemark,
      exceptionDraft: { ...exceptionDraft },
      otherLabels: { ...otherLabels },
      otherUnits: { ...otherUnits },
      extraOthers: extraOthers.map((o) => ({ ...o })),
      disabledFixedOtherIds: [...disabledFixedOtherIds],
      refDraft: { ...refDraft },
      currency: deskQuote.currency,
      total: deskQuote.total,
      cw: deskQuote.cw,
      cbm: deskQuote.cbm,
      breakLabel: deskQuote.breakLabel,
      savedPdfHtml,
      pinned: Boolean(opts?.pin),
      caseName: opts?.pin ? name : undefined,
    }

    const fp = caseFingerprint(item)

    setQuoteHistory((prev) => {
      if (opts?.pin) {
        const existing = prev.findIndex(
          (row) => row.pinned && caseFingerprint(row) === fp,
        )
        if (existing >= 0) {
          const next = [...prev]
          const keepId = next[existing].id
          next.splice(existing, 1)
          return [{ ...item, id: keepId, pinned: true, caseName: name }, ...next].slice(
            0,
            200,
          )
        }
        return [item, ...prev].slice(0, 200)
      }

      if (opts?.auto) {
        const existing = prev.findIndex(
          (row) => !row.pinned && caseFingerprint(row) === fp,
        )
        if (existing >= 0) {
          const next = [...prev]
          const keep = next[existing]
          next.splice(existing, 1)
          return [
            {
              ...item,
              id: keep.id,
              pinned: false,
              caseName: keep.caseName,
            },
            ...next,
          ].slice(0, 200)
        }
      }

      return [item, ...prev].slice(0, 200)
    })

    if (opts?.pin) {
      setCaseNameDraft('')
      setHistoryNotice({
        kind: 'reuse',
        text: `Pinned “${name}”. Next time click it at the top of Input — only change cargo or 예외 if this job is different.`,
      })
      return
    }

    if (!opts?.auto) {
      setHistoryNotice({
        kind: 'open',
        text: 'Saved to history. Pin it if this is a repeat case.',
      })
    }
  }

  const togglePinHistory = (id: string) => {
    setQuoteHistory((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const pinned = !row.pinned
        return {
          ...row,
          pinned,
          caseName: pinned
            ? row.caseName?.trim() || defaultCaseName(row)
            : row.caseName,
        }
      }),
    )
  }

  const filteredQuoteHistory = useMemo(() => {
    const q = historyQuery.trim().toUpperCase()
    const dateFrom = historyDateFrom.trim()
    const dateTo = historyDateTo.trim()
    const minTotal = historyMinTotal.trim() ? Number(historyMinTotal) : null
    const maxTotal = historyMaxTotal.trim() ? Number(historyMaxTotal) : null
    const minGross = historyMinGross.trim() ? Number(historyMinGross) : null
    const maxGross = historyMaxGross.trim() ? Number(historyMaxGross) : null
    const tolerancePct = historySizeTolerance.trim()
      ? Number(historySizeTolerance)
      : 20

    const isFiniteNum = (n: number | null) => n != null && Number.isFinite(n)
    const currentRoute = `${origin}-${destination}`.toUpperCase()

    return quoteHistory.filter((item) => {
      if (q && !historySearchBlob(item).includes(q)) return false

      if (historySameRoute) {
        const route = `${item.origin}-${item.destination}`.toUpperCase()
        if (route !== currentRoute) return false
      }

      if (dateFrom) {
        const itemDate = item.createdAt.slice(0, 10)
        if (itemDate < dateFrom) return false
      }
      if (dateTo) {
        const itemDate = item.createdAt.slice(0, 10)
        if (itemDate > dateTo) return false
      }

      if (isFiniteNum(minTotal) && item.total < minTotal!) return false
      if (isFiniteNum(maxTotal) && item.total > maxTotal!) return false

      const grossSum = item.cargoPieces.reduce(
        (s, p) => s + (Number(p.gross) || 0),
        0,
      )
      if (isFiniteNum(minGross) && grossSum < minGross!) return false
      if (isFiniteNum(maxGross) && grossSum > maxGross!) return false

      if (historyUseCurrentSize && Number.isFinite(tolerancePct) && tolerancePct >= 0) {
        const cbm = deskQuote?.cbm ?? cargoCbm
        const cw = deskQuote?.cw ?? Math.max(cargoGross, cargoCbm * 167)
        const ratio = tolerancePct / 100
        if (item.cbm < cbm * (1 - ratio) || item.cbm > cbm * (1 + ratio)) {
          return false
        }
        if (item.cw < cw * (1 - ratio) || item.cw > cw * (1 + ratio)) {
          return false
        }
      }

      return true
    })
  }, [
    quoteHistory,
    historyQuery,
    historySameRoute,
    origin,
    destination,
    historyDateFrom,
    historyDateTo,
    historyMinTotal,
    historyMaxTotal,
    historyMinGross,
    historyMaxGross,
    historyUseCurrentSize,
    historySizeTolerance,
    deskQuote,
    cargoCbm,
    cargoGross,
  ])

  const applyHistoryItem = (item: QuoteHistoryItem) => {
    const loaded = (item.cargoPieces ?? []).slice(0, CARGO_DETAIL_SLOTS)
    const nextPieces: CargoPieceDraft[] = Array.from(
      { length: CARGO_DETAIL_SLOTS },
      (_, i) =>
        loaded[i] ?? {
          id: `piece-${i + 1}`,
          length: '',
          width: '',
          height: '',
          qty: '',
          gross: '',
        },
    )
    setConsignee(item.consignee ?? '')
    setOrigin(item.origin)
    setDestination(item.destination)
    setCargoPieces(nextPieces)
    setBlCountDraft(String(item.blCount))
    setFxDraft(item.fxDraft)
    setCarrierCode(item.carrierCode)
    setDeskRemark(item.deskRemark)
    setExceptionDraft({ ...item.exceptionDraft })
    setOtherLabels({ ...item.otherLabels })
    setOtherUnits({ ...item.otherUnits })
    setExtraOthers(item.extraOthers.map((o) => ({ ...o })))
    setDisabledFixedOtherIds([...item.disabledFixedOtherIds])
    setRefDraft({ ...(item.refDraft ?? {}) })
  }

  const openQuoteFromHistory = (item: QuoteHistoryItem) => {
    applyHistoryItem(item)
    setLoadedHistoryPdfHtml(item.savedPdfHtml ?? '')
    setHistoryNotice({
      kind: 'open',
      text: `Opened saved quote · ${item.origin}-${item.destination}${
        item.consignee ? ` · ${item.consignee}` : ''
      }. Reprint from PDF, or switch to Input to change it.`,
    })
    setTab('quote')
  }

  const reuseQuoteFromHistory = (item: QuoteHistoryItem) => {
    applyHistoryItem(item)
    setLoadedHistoryPdfHtml('')
    setHistoryNotice({
      kind: 'reuse',
      text: `Reused “${
        item.caseName || `${item.origin}-${item.destination}`
      }”. Change only cargo / 예외 / Remark if this job differs, then Save PDF.`,
    })
    setTab('input')
    window.setTimeout(() => {
      const el = cellRefs.current.consignee
      el?.focus()
      el?.select()
    }, 80)
  }

  const deleteQuoteFromHistory = (id: string) => {
    setQuoteHistory((prev) => prev.filter((item) => item.id !== id))
  }

  const openLoadedHistoryPdf = () => {
    if (!loadedHistoryPdfHtml) return
    printQuotation(loadedHistoryPdfHtml)
  }

  // Excel M14: sum of per-slot MAX(Gross, CBM×167) — not max(ΣGW, ΣCBM×167)
  const chargeableWeight = cargoCbm * 167
  const effectiveCw = usingDetailedCargo
    ? pieceMetrics.reduce((sum, piece) => sum + (piece.cwValue > 0 ? piece.cwValue : 0), 0)
    : Math.max(cargoGross, chargeableWeight)
  const routeKey = `${origin}-${destination}`
  const routeIndex = master?.air.findIndex((a) => a.route === routeKey) ?? -1
  const routeRow = master && routeIndex >= 0 ? master.air[routeIndex] : null

  const pinnedCases = useMemo(
    () => quoteHistory.filter((row) => row.pinned),
    [quoteHistory],
  )
  const recentJobs = useMemo(
    () => quoteHistory.filter((row) => !row.pinned).slice(0, 6),
    [quoteHistory],
  )

  const historyShown = [...filteredQuoteHistory]
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    .slice(0, 40)
  const historyPanel = (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-slate-800">Repeat cases & history</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            Pin a case once. Next jobs: click it, change only what is different, Save PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={caseNameDraft}
            onChange={(e) => setCaseNameDraft(e.target.value)}
            placeholder="Case name (Chocolate KEEP COOL)"
            className="h-10 min-w-[180px] rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
          <button
            type="button"
            onClick={() => saveQuoteToHistory({ pin: true })}
            disabled={!deskQuote}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-wac-orange px-4 text-sm font-bold text-white hover:bg-[#d6451c] disabled:opacity-40"
          >
            <Pin className="h-3.5 w-3.5" />
            Pin this case
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={historyQuery}
            onChange={(e) => setHistoryQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && historyShown[0]) {
                e.preventDefault()
                reuseQuoteFromHistory(historyShown[0])
              }
            }}
            placeholder="Search consignee, route, remark, carrier, size…"
            className="h-10 w-full rounded-md border border-slate-200 bg-white pr-3 pl-9 text-sm font-bold outline-none focus:border-wac-orange"
          />
        </div>
        <button
          type="button"
          onClick={() => setHistoryShowAdvanced((v) => !v)}
          className="h-10 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:border-wac-orange"
        >
          {historyShowAdvanced ? 'Hide filters' : 'More filters'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setHistorySameRoute((v) => !v)}
          className={`h-8 rounded-full border px-3 text-[11px] font-bold ${
            historySameRoute
              ? 'border-wac-navy bg-wac-navy text-white'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          This route {origin}-{destination}
        </button>
        <button
          type="button"
          onClick={() => setHistoryUseCurrentSize((v) => !v)}
          className={`h-8 rounded-full border px-3 text-[11px] font-bold ${
            historyUseCurrentSize
              ? 'border-wac-navy bg-wac-navy text-white'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          Similar size ±{historySizeTolerance || 20}%
        </button>
        <span className="text-[11px] font-semibold text-slate-500">
          {filteredQuoteHistory.length} match
          {filteredQuoteHistory.length === 1 ? '' : 'es'}
          {filteredQuoteHistory.length > historyShown.length
            ? ` · showing ${historyShown.length}`
            : ''}
        </span>
      </div>

      {historyShowAdvanced ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={historyDateFrom}
            onChange={(e) => setHistoryDateFrom(e.target.value)}
            type="date"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
          <input
            value={historyDateTo}
            onChange={(e) => setHistoryDateTo(e.target.value)}
            type="date"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
          <input
            value={historyMinTotal}
            onChange={(e) => setHistoryMinTotal(e.target.value)}
            placeholder="Min Total"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
          <input
            value={historyMaxTotal}
            onChange={(e) => setHistoryMaxTotal(e.target.value)}
            placeholder="Max Total"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
          <input
            value={historyMinGross}
            onChange={(e) => setHistoryMinGross(e.target.value)}
            placeholder="Min Gross"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
          <input
            value={historyMaxGross}
            onChange={(e) => setHistoryMaxGross(e.target.value)}
            placeholder="Max Gross"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
          <input
            value={historySizeTolerance}
            onChange={(e) => setHistorySizeTolerance(e.target.value)}
            placeholder="Size ±%"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-wac-orange"
          />
        </div>
      ) : null}

      <div className="mt-3 max-h-72 overflow-auto rounded-md border border-slate-100">
        {historyShown.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm font-semibold text-slate-500">
            {quoteHistory.length === 0
              ? 'No cases yet. Save PDF and it is stored automatically. Pin if you will quote it again.'
              : 'No matching history.'}
          </div>
        ) : (
          historyShown.map((item) => {
            const dims = cargoDimsText(item.cargoPieces)
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-800">
                    {item.pinned ? (
                      <span className="mr-1.5 text-[10px] font-black tracking-wider text-slate-400">
                        PIN
                      </span>
                    ) : null}
                    {item.caseName ? (
                      <span className="text-slate-800">{item.caseName} · </span>
                    ) : null}
                    {item.consignee ? (
                      <span className="text-sky-800">{item.consignee}</span>
                    ) : (
                      <span className="font-semibold text-slate-400">No consignee</span>
                    )}
                    <span className="font-bold text-slate-500">
                      {' '}
                      · {item.origin}-{item.destination} · {item.currency}{' '}
                      {item.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="truncate text-xs font-semibold text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString('en-GB')}
                    {item.carrierCode ? ` · ${item.carrierCode}` : ''}
                    {dims ? ` · ${dims}` : ''}
                    {` · C.W. ${item.cw.toFixed(1)}`}
                    {item.deskRemark.trim()
                      ? ` · ${item.deskRemark.trim()}`
                      : ''}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => reuseQuoteFromHistory(item)}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-wac-orange px-3 text-sm font-bold text-white hover:bg-[#d6451c]"
                  >
                    Reuse
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePinHistory(item.id)}
                    className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-bold ${
                      item.pinned
                        ? 'border-wac-orange bg-orange-50 text-wac-orange'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-wac-orange'
                    }`}
                  >
                    {item.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openQuoteFromHistory(item)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-wac-orange"
                  >
                    Open
                  </button>
                  {item.savedPdfHtml ? (
                    <button
                      type="button"
                      onClick={() => printQuotation(item.savedPdfHtml!)}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-wac-orange"
                    >
                      PDF
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteQuoteFromHistory(item.id)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7ECEB] font-sans text-wac-navy">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3 lg:px-10">
          <div className="flex items-center gap-3">
            <img src="/wac-mark-hero.png" alt="WAC" className="h-9 w-auto" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-wac-orange uppercase">
                Internal Use Only
              </p>
              <p className="text-sm font-extrabold text-wac-navy">
                Origin Cost Desk
              </p>
            </div>
          </div>

          <nav className="overflow-x-auto">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {(
                [
                  ['master', 'Master_DB'],
                  ['input', 'Input'],
                  ['quote', 'Quotation'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    tab === key
                      ? 'bg-wac-navy text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-wac-navy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-slate-200/70 bg-[#F7ECEB]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#F6E2DE_0%,_#F7ECEB_42%,_#F3F0EF_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,_rgba(240,80,35,0.14),_transparent)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1600px] px-6 pt-14 pb-10 lg:px-10">
          <div className="mx-auto max-w-[760px] text-center">
            <img
              src="/wac-mark-hero.png"
              alt="WAC"
              className="mx-auto mb-5 h-16 w-auto object-contain sm:h-20"
            />
            <h1 className="text-[34px] leading-[1.15] font-extrabold text-wac-navy sm:text-[46px]">
              Origin Cost Desk
            </h1>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Route
              </p>
              <p className="mt-1 text-lg font-extrabold text-wac-navy">
                {origin} → {destination}
              </p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Gross / Vol
              </p>
              <p className="mt-1 text-lg font-extrabold text-wac-navy">
                {cargoGross.toFixed(1)} / {chargeableWeight.toFixed(1)}
              </p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Chargeable Wt
              </p>
              <p className="mt-1 text-lg font-extrabold text-emerald-700">
                {effectiveCw.toFixed(1)} KG
              </p>
            </div>
            <div className="bg-wac-navy px-4 py-3">
              <p className="text-[10px] font-bold tracking-wider text-white/55 uppercase">
                Quote Total
              </p>
              <p className="mt-1 text-lg font-extrabold text-wac-orange">
                {deskQuote
                  ? `${deskQuote.currency} ${deskQuote.total.toFixed(2)}`
                  : 'Calculate'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        {tab === 'master' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-wac-navy" />
                  <p className="text-[11px] font-bold tracking-wider text-wac-navy uppercase">
                    Master_DB
                  </p>
                </div>
              </div>
              {cmImportMsg ? (
                <p className="mt-2 text-[12px] text-slate-500">{cmImportMsg}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
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
                        const next = normalizeMaster(await parseCmMasterFile(file))
                        setMaster(next)
                        setCmImportMsg(
                          `Loaded ${next.air.length} routes · ${next.breaks.map((b) => b.label).join(' / ')} · ${next.local.length} local charges`,
                        )
                      } catch (err) {
                        setCmImportMsg(
                          err instanceof Error ? err.message : 'Import failed',
                        )
                      }
                    })()
                  }}
                />
              </div>
            </div>

            {master ? (
              <>
                <CmMasterEditor master={master} onChange={setMaster} />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTab('input')}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-wac-navy px-5 text-sm font-bold text-white hover:bg-[#243447]"
                  >
                    Next: Input
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-wac-orange" />
                <p className="text-sm font-semibold text-slate-600">
                  Master_DB loading...
                </p>
              </div>
            )}
          </div>
        ) : null}

        {tab === 'input' ? (
          <div className="space-y-5">
            {historyNotice ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  historyNotice.kind === 'reuse'
                    ? 'border-orange-200 bg-orange-50 text-wac-navy'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {historyNotice.text}
              </div>
            ) : null}
            {pinnedCases.length > 0 || recentJobs.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                {pinnedCases.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Repeat cases — click, then change only what is different
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pinnedCases.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => reuseQuoteFromHistory(item)}
                          className="inline-flex h-9 items-center rounded-full bg-wac-navy px-3 text-[12px] font-bold text-white hover:bg-[#243447]"
                        >
                          {item.consignee ? (
                            <span className="text-orange-300">{item.consignee}</span>
                          ) : null}
                          <span className={item.consignee ? 'ml-1.5 text-white/85' : ''}>
                            {item.caseName || `${item.origin}-${item.destination}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {recentJobs.length > 0 ? (
                  <div className={pinnedCases.length > 0 ? 'mt-3' : ''}>
                    <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Recent
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recentJobs.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => reuseQuoteFromHistory(item)}
                          className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 hover:border-wac-orange"
                        >
                          {item.consignee ? (
                            <span className="text-sky-800">{item.consignee}</span>
                          ) : (
                            <span>
                              {item.origin}-{item.destination}
                            </span>
                          )}
                          {item.consignee ? (
                            <span className="ml-1 font-bold text-slate-500">
                              {item.origin}-{item.destination}
                            </span>
                          ) : null}
                          <span className="ml-1 font-semibold text-slate-400">
                            {item.currency} {item.total.toFixed(0)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <form
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              onSubmit={(e) => {
                e.preventDefault()
                handleCalculate()
              }}
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="text-xl font-extrabold text-white bg-[#243447] px-4 py-2 inline-flex rounded">
                  항공 가견적 시뮬레이터
                </h2>
              </div>

              <div>
                <table className="w-full table-fixed border-collapse text-[12px] sm:text-[13px]">
                  <tbody>
                    <tr>
                      <th
                        colSpan={4}
                        className="bg-[#F05023] px-3 py-2.5 text-left text-white text-sm font-extrabold uppercase tracking-wide"
                      >
                        1. 화물 입력
                      </th>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">Consignee</th>
                      <td className="bg-[#FFFBEA] px-2 py-2">
                        <input
                          ref={(el) => {
                            cellRefs.current.consignee = el
                          }}
                          className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 font-bold shadow-sm outline-none focus:border-wac-orange"
                          value={consignee}
                          onChange={(e) => setConsignee(e.target.value)}
                          onKeyDown={(e) =>
                            handleCellNav(e, {
                              enter: 'route',
                              down: 'route',
                              right: 'blCount',
                            })
                          }
                          placeholder="Customer / Consignee"
                        />
                      </td>
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">BL Count</th>
                      <td className="bg-[#FFFBEA] px-2 py-2">
                        <input
                          ref={(el) => {
                            cellRefs.current.blCount = el
                          }}
                          onKeyDown={(e) =>
                            handleCellNav(e, {
                              enter: `${cargoPieces[0]?.id}-l`,
                              down: `${cargoPieces[0]?.id}-l`,
                              left: 'consignee',
                            })
                          }
                          type="text"
                          className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 shadow-sm outline-none focus:border-wac-orange"
                          value={blCountDraft}
                          onChange={(e) => setBlCountDraft(e.target.value)}
                        />
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">Route</th>
                      <td className="bg-[#FFFBEA] px-3 py-2">
                        <div ref={routePickerWrapRef} className="relative">
                          <input
                            ref={(el) => {
                              cellRefs.current.route = el
                            }}
                            className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 font-bold uppercase shadow-sm outline-none focus:border-wac-orange text-center"
                            value={`${origin}${destination ? `-${destination}` : ''}`}
                            onChange={(e) => {
                              const v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                              const dash = v.indexOf('-')
                              if (dash < 0) {
                                setOrigin(v.slice(0, 8))
                                setDestination('')
                                return
                              }
                              setOrigin(v.slice(0, dash).slice(0, 8))
                              setDestination(
                                v.slice(dash + 1).replace(/-/g, '').slice(0, 8),
                              )
                            }}
                            onFocus={() => setRoutePickerOpen(true)}
                            onClick={() => setRoutePickerOpen(true)}
                            onKeyDown={(e) =>
                              handleCellNav(e, {
                                enter: `${cargoPieces[0]?.id}-l`,
                                down: `${cargoPieces[0]?.id}-l`,
                                up: 'consignee',
                                right: 'blCount',
                              })
                            }
                          />
                          {routePickerOpen && master ? (
                            <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                              {master.air.map((a) => {
                                const r = a.route
                                const selected = r === `${origin}-${destination}`
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    onMouseDown={(ev) => ev.preventDefault()}
                                    onClick={() => {
                                      const [o, d] = r.split('-')
                                      if (o) setOrigin(o)
                                      if (d) setDestination(d)
                                      setRoutePickerOpen(false)
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm font-bold ${
                                      selected
                                        ? 'bg-[#243447] text-white'
                                        : 'bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {r}
                                  </button>
                                )
                              })}
                              {master.air.every((a) => a.route !== routeKey) &&
                              origin &&
                              destination ? (
                                <button
                                  type="button"
                                  onMouseDown={(ev) => ev.preventDefault()}
                                  onClick={() => {
                                    setMaster(addAirRoute(master, { route: routeKey }))
                                    setRoutePickerOpen(false)
                                  }}
                                  className="w-full border-t border-slate-100 px-3 py-2 text-left text-[11px] font-bold text-wac-orange hover:bg-orange-50"
                                >
                                  Add {routeKey} to Master
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">C.W.</th>
                      <td className="bg-emerald-50 px-3 py-2 text-center">
                        <span className="text-lg font-extrabold text-emerald-700">{effectiveCw.toFixed(2)}</span>
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">Gross (kg)</th>
                      <td className="bg-white px-3 py-2 text-center">
                        <span className="text-lg font-extrabold text-wac-navy">{cargoGross.toFixed(1)}</span>
                      </td>
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase"></th>
                      <td className="bg-white px-3 py-2"></td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 align-top text-left font-bold text-slate-600 uppercase">
                        Cargo Detail
                      </th>
                      <td colSpan={3} className="bg-white px-3 py-3">
                        <div className="space-y-3">
                          <div className="rounded-lg border border-slate-200">
                            <table className="w-full table-fixed border-collapse text-[12px]">
                              <thead>
                                <tr className="bg-[#243447] text-white">
                                  <th className="w-28 px-3 py-2 text-left font-bold uppercase">Spec</th>
                                  {pieceMetrics.map((piece, index) => (
                                    <th
                                      key={piece.id}
                                      className="px-2 py-2 text-center font-bold"
                                    >
                                      #{index + 1}
                                    </th>
                                  ))}
                                  <th className="bg-wac-orange px-3 py-2 text-center font-bold uppercase">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-t border-slate-200">
                                  <th className="bg-[#F4F7FB] px-3 py-2 text-left font-bold text-slate-600 uppercase">L (cm)</th>
                                  {cargoPieces.map((piece, pieceIndex) => (
                                    <td key={`${piece.id}-l`} className="bg-[#FFFBEA] px-2 py-2">
                                      <input
                                        ref={(el) => { cellRefs.current[`${piece.id}-l`] = el }}
                                        onKeyDown={(e) =>
                                          handleCellNav(e, {
                                            enter: `${piece.id}-w`,
                                            down: `${piece.id}-w`,
                                            up: pieceIndex === 0 ? 'route' : `${cargoPieces[pieceIndex - 1].id}-l`,
                                            left: `${piece.id}-gross`,
                                            right: `${cargoPieces[pieceIndex + 1]?.id ?? piece.id}-l`,
                                          })
                                        }
                                        type="text"
                                        onPaste={handleCargoPaste(pieceIndex)}
                                        className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-center shadow-sm outline-none focus:border-wac-orange"
                                        value={piece.length}
                                        onChange={(e) =>
                                          setCargoPieces((rows) =>
                                            rows.map((row) =>
                                              row.id === piece.id ? { ...row, length: e.target.value } : row,
                                            ),
                                          )
                                        }
                                      />
                                    </td>
                                  ))}
                                  <td className="bg-slate-50 px-3 py-2 text-center text-slate-400">-</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <th className="bg-[#F4F7FB] px-3 py-2 text-left font-bold text-slate-600 uppercase">W (cm)</th>
                                  {cargoPieces.map((piece, pieceIndex) => (
                                    <td key={`${piece.id}-w`} className="bg-[#FFFBEA] px-2 py-2">
                                      <input
                                        ref={(el) => { cellRefs.current[`${piece.id}-w`] = el }}
                                        onKeyDown={(e) =>
                                          handleCellNav(e, {
                                            enter: `${piece.id}-h`,
                                            down: `${piece.id}-h`,
                                            up: `${piece.id}-l`,
                                            left: `${cargoPieces[pieceIndex - 1]?.id ?? piece.id}-w`,
                                            right: `${cargoPieces[pieceIndex + 1]?.id ?? piece.id}-w`,
                                          })
                                        }
                                        type="text"
                                        onPaste={handleCargoPaste(pieceIndex)}
                                        className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-center shadow-sm outline-none focus:border-wac-orange"
                                        value={piece.width}
                                        onChange={(e) =>
                                          setCargoPieces((rows) =>
                                            rows.map((row) =>
                                              row.id === piece.id ? { ...row, width: e.target.value } : row,
                                            ),
                                          )
                                        }
                                      />
                                    </td>
                                  ))}
                                  <td className="bg-slate-50 px-3 py-2 text-center text-slate-400">-</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <th className="bg-[#F4F7FB] px-3 py-2 text-left font-bold text-slate-600 uppercase">H (cm)</th>
                                  {cargoPieces.map((piece, pieceIndex) => (
                                    <td key={`${piece.id}-h`} className="bg-[#FFFBEA] px-2 py-2">
                                      <input
                                        ref={(el) => { cellRefs.current[`${piece.id}-h`] = el }}
                                        onKeyDown={(e) =>
                                          handleCellNav(e, {
                                            enter: `${piece.id}-qty`,
                                            down: `${piece.id}-qty`,
                                            up: `${piece.id}-w`,
                                            left: `${cargoPieces[pieceIndex - 1]?.id ?? piece.id}-h`,
                                            right: `${cargoPieces[pieceIndex + 1]?.id ?? piece.id}-h`,
                                          })
                                        }
                                        type="text"
                                        onPaste={handleCargoPaste(pieceIndex)}
                                        className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-center shadow-sm outline-none focus:border-wac-orange"
                                        value={piece.height}
                                        onChange={(e) =>
                                          setCargoPieces((rows) =>
                                            rows.map((row) =>
                                              row.id === piece.id ? { ...row, height: e.target.value } : row,
                                            ),
                                          )
                                        }
                                      />
                                    </td>
                                  ))}
                                  <td className="bg-slate-50 px-3 py-2 text-center text-slate-400">-</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <th className="bg-[#F4F7FB] px-3 py-2 text-left font-bold text-slate-600 uppercase">Qty</th>
                                  {cargoPieces.map((piece, pieceIndex) => (
                                    <td key={`${piece.id}-qty`} className="bg-[#FFFBEA] px-2 py-2">
                                      <input
                                        ref={(el) => { cellRefs.current[`${piece.id}-qty`] = el }}
                                        onKeyDown={(e) =>
                                          handleCellNav(e, {
                                            enter: `${piece.id}-gross`,
                                            down: `${piece.id}-gross`,
                                            up: `${piece.id}-h`,
                                            left: `${cargoPieces[pieceIndex - 1]?.id ?? piece.id}-qty`,
                                            right: `${cargoPieces[pieceIndex + 1]?.id ?? piece.id}-qty`,
                                          })
                                        }
                                        type="text"
                                        onPaste={handleCargoPaste(pieceIndex)}
                                        className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-center shadow-sm outline-none focus:border-wac-orange"
                                        value={piece.qty}
                                        onChange={(e) =>
                                          setCargoPieces((rows) =>
                                            rows.map((row) =>
                                              row.id === piece.id ? { ...row, qty: e.target.value } : row,
                                            ),
                                          )
                                        }
                                      />
                                    </td>
                                  ))}
                                  <td className="bg-emerald-50 px-3 py-2 text-center font-bold text-emerald-700">{cargoQty}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <th className="bg-[#F4F7FB] px-3 py-2 text-left font-bold text-slate-600 uppercase">Gross</th>
                                  {cargoPieces.map((piece, index) => (
                                    <td key={`${piece.id}-gross`} className="bg-[#FFFBEA] px-2 py-2">
                                      <input
                                        ref={(el) => { cellRefs.current[`${piece.id}-gross`] = el }}
                                        onKeyDown={(e) =>
                                          handleCellNav(e, {
                                            enter: `${deskQuote?.lines[0]?.id ?? 'air'}-exc`,
                                            down: `${deskQuote?.lines[0]?.id ?? 'air'}-exc`,
                                            up: `${piece.id}-qty`,
                                            left: `${cargoPieces[index - 1]?.id ?? piece.id}-gross`,
                                            right: `${cargoPieces[index + 1]?.id ?? piece.id}-gross`,
                                          })
                                        }
                                        type="text"
                                        onPaste={handleCargoPaste(index)}
                                        className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-center shadow-sm outline-none focus:border-wac-orange"
                                        value={piece.gross}
                                        onChange={(e) =>
                                          setCargoPieces((rows) =>
                                            rows.map((row) =>
                                              row.id === piece.id ? { ...row, gross: e.target.value } : row,
                                            ),
                                          )
                                        }
                                      />
                                    </td>
                                  ))}
                                  <td className="bg-emerald-50 px-3 py-2 text-center font-bold text-emerald-700">{cargoGross.toFixed(1)}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <th className="bg-[#F4F7FB] px-3 py-2 text-left font-bold text-slate-600 uppercase">CBM</th>
                                  {pieceMetrics.map((piece) => (
                                    <td key={`${piece.id}-cbm`} className="bg-white px-3 py-2 text-center font-semibold text-wac-navy">
                                      {piece.cbmValue > 0 ? piece.cbmValue.toFixed(3) : '-'}
                                    </td>
                                  ))}
                                  <td className="bg-emerald-50 px-3 py-2 text-center font-bold text-emerald-700">{cargoCbm.toFixed(3)}</td>
                                </tr>
                                <tr className="border-t border-slate-200">
                                  <th className="bg-[#243447] px-3 py-2 text-left font-bold text-white uppercase">C.W.</th>
                                  {pieceMetrics.map((piece) => (
                                    <td key={`${piece.id}-cw`} className="bg-emerald-50 px-3 py-2 text-center font-bold text-emerald-700">
                                      {piece.cwValue > 0 ? piece.cwValue.toFixed(2) : '-'}
                                    </td>
                                  ))}
                                  <td className="bg-emerald-100 px-3 py-2 text-center font-black text-emerald-700">{effectiveCw.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <th colSpan={4} className="px-3 py-3 text-left font-extrabold text-slate-700">
                        2. 자동 계산
                      </th>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">CBM</th>
                      <td className="bg-emerald-50 px-3 py-2 font-black text-emerald-700">{cargoCbm.toFixed(3)}</td>
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">실중량합</th>
                      <td className="bg-emerald-50 px-3 py-2 font-black text-emerald-700">{cargoGross.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">볼륨중량</th>
                      <td className="bg-emerald-50 px-3 py-2 font-black text-emerald-700">{chargeableWeight.toFixed(2)}</td>
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">C.W.</th>
                      <td className="bg-emerald-100 px-3 py-2 font-black text-emerald-800">{effectiveCw.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">Break</th>
                      <td className="bg-white px-3 py-2 text-center font-bold text-slate-600">
                        {deskQuote ? deskQuote.breakLabel : ''}
                      </td>
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">Air Rate</th>
                      <td className="bg-white px-3 py-2 text-center font-bold text-slate-600">
                        {deskQuote ? deskQuote.airRate.toFixed(2) : ''}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">Air MIN</th>
                      <td className="bg-white px-3 py-2 text-center font-bold text-slate-600">
                        {routeRow
                          ? routeRow.min.toFixed(2)
                          : deskQuote
                            ? deskQuote.airMin.toFixed(2)
                            : ''}
                      </td>
                      <th className="bg-[#F4F7FB] px-3 py-3" />
                      <td className="bg-white px-3 py-2" />
                    </tr>
                    <tr className="border-t border-slate-200">
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">FSC /kg</th>
                      <td className="bg-white px-3 py-2 text-center font-bold text-slate-600">
                        {routeRow ? routeRow.fsc.toFixed(2) : deskQuote ? deskQuote.fscPerKg.toFixed(2) : ''}
                      </td>
                      <th className="bg-[#F4F7FB] px-3 py-3 text-left font-bold text-slate-600 uppercase">SSC /kg</th>
                      <td className="bg-white px-3 py-2 text-center font-bold text-slate-600">
                        {routeRow ? routeRow.ssc.toFixed(2) : deskQuote ? deskQuote.sscPerKg.toFixed(2) : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="submit"
                  disabled={isLoading || !master}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-wac-orange px-4 text-sm font-bold text-white shadow-lg shadow-[#F05023]/25 disabled:opacity-60"
                >
                  {isLoading ? 'Calculating...' : 'Calculate'}
                </button>
              </div>
            </form>

            {!master ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  Load Master_DB first.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold tracking-wider text-wac-navy uppercase">
                        3. 비용 내역
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addOtherRow}
                      className="inline-flex items-center gap-1 rounded-lg border border-wac-orange bg-white px-3 py-2 text-[11px] font-bold text-wac-orange hover:bg-orange-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Other
                    </button>
                  </div>
                </div>
                <div className="max-w-full">
                  <table className="w-full table-fixed text-left text-[13px]">
                    <colgroup>
                      <col className="w-[34%]" />
                      <col className="w-[16%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#243447] text-white text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-3 py-2.5">항목</th>
                        <th className="px-3 py-2.5">단위</th>
                        <th className="px-3 py-2.5 text-right">참고</th>
                        <th className="px-3 py-2.5 text-right">예외(J)</th>
                        <th className="px-3 py-2.5 text-right">TOTAL</th>
                        <th className="w-12 px-3 py-2.5 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deskQuote?.lines.map((l, idx) => {
                        const showLabelInput = Boolean(l.editableLabel)
                        const showUnitInput = Boolean(l.editableUnit)
                        const showRefInput = Boolean(l.editableRef)
                        const thisLabelCellId = `${l.id}-label`
                        const thisUnitCellId = `${l.id}-unit`
                        const thisExcCellId = `${l.id}-exc`
                        const prevLineId =
                          deskQuote!.lines[idx - 1]?.id ??
                          deskQuote!.lines[deskQuote!.lines.length - 1]?.id
                        const nextLineId =
                          deskQuote!.lines[idx + 1]?.id ??
                          deskQuote!.lines[0]?.id
                        const prevLabelCellId = prevLineId
                          ? `${prevLineId}-label`
                          : undefined
                        const prevUnitCellId = prevLineId
                          ? `${prevLineId}-unit`
                          : undefined
                        const prevExcCellId = prevLineId
                          ? `${prevLineId}-exc`
                          : undefined
                        const nextLabelCellId = nextLineId
                          ? `${nextLineId}-label`
                          : undefined
                        const nextUnitCellId = nextLineId
                          ? `${nextLineId}-unit`
                          : undefined
                        const nextExcCellId = nextLineId
                          ? `${nextLineId}-exc`
                          : undefined
                        const isDynamicOther = extraOthers.some((row) => row.id === l.id)

                        return (
                          <tr key={l.id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 align-top">
                              {showLabelInput ? (
                                <input
                                  ref={(el) => {
                                    cellRefs.current[thisLabelCellId] = el
                                  }}
                                  type="text"
                                  value={
                                    l.isOtherSlot
                                      ? otherLabels[l.id] ?? l.label
                                      : l.label
                                  }
                                  onChange={(e) => {
                                    setOtherLabels((d) => ({
                                      ...d,
                                      [l.id]: e.target.value,
                                    }))
                                  }}
                                  onKeyDown={(e) =>
                                    handleCellNav(e, {
                                      enter: nextLabelCellId,
                                      down: nextLabelCellId,
                                      up: prevLabelCellId,
                                      right: thisUnitCellId,
                                    })
                                  }
                                  className="h-9 w-full rounded border border-yellow-200 bg-yellow-50 px-2 text-[12px] font-semibold outline-none focus:border-wac-orange"
                                />
                              ) : (
                                <span className="font-semibold text-wac-navy">
                                  {l.label}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {showUnitInput ? (
                                <input
                                  ref={(el) => {
                                    cellRefs.current[thisUnitCellId] = el
                                  }}
                                  type="text"
                                  value={otherUnits[l.id] ?? l.unit}
                                  onChange={(e) =>
                                    setOtherUnits((u) => ({
                                      ...u,
                                      [l.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) =>
                                    handleCellNav(e, {
                                      enter: nextUnitCellId,
                                      down: nextUnitCellId,
                                      up: prevUnitCellId,
                                      left: thisLabelCellId,
                                      right: thisExcCellId,
                                    })
                                  }
                                  className="h-9 w-full rounded border border-slate-200 px-2 text-[12px] outline-none focus:border-wac-orange"
                                />
                              ) : (
                                <span className="text-slate-600">{l.unit}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-700">
                              {showRefInput ? (
                                <input
                                  ref={(el) => {
                                    cellRefs.current[`${l.id}-ref`] = el
                                  }}
                                  type="text"
                                  value={refDraft[l.id] ?? l.ref.toFixed(2)}
                                  onChange={(e) =>
                                    setRefDraft((d) => ({
                                      ...d,
                                      [l.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) =>
                                    handleCellNav(e, {
                                      enter: thisExcCellId,
                                      down: thisExcCellId,
                                      left: thisUnitCellId,
                                      right: thisExcCellId,
                                    })
                                  }
                                  className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-right text-[12px] outline-none focus:border-wac-orange"
                                />
                              ) : (
                                l.ref.toFixed(2)
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <input
                                ref={(el) => {
                                  cellRefs.current[thisExcCellId] = el
                                }}
                                type="text"
                                placeholder=""
                                value={exceptionDraft[l.id] ?? ''}
                                onKeyDown={(e) =>
                                  handleCellNav(e, {
                                    enter: nextExcCellId,
                                    down: nextExcCellId,
                                    up: prevExcCellId,
                                    left: thisUnitCellId,
                                  })
                                }
                                onChange={(e) =>
                                  setExceptionDraft((d) => ({
                                    ...d,
                                    [l.id]: e.target.value,
                                  }))
                                }
                                className="h-9 w-full rounded border border-yellow-200 bg-yellow-50 px-2 text-right text-[12px] font-medium outline-none focus:border-wac-orange"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                              {l.amount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {isDynamicOther ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtraOthers((rows) =>
                                      rows.filter((row) => row.id !== l.id),
                                    )
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
                                  aria-label="Remove other"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#F05023] bg-[#F05023]">
                        <td colSpan={4} className="px-3 py-3 text-right text-[11px] font-bold tracking-wider text-white uppercase">
                          Total Appx. Amount
                        </td>
                        <td className="px-3 py-3 text-right text-lg font-black text-white">
                          {deskQuote?.currency} {deskQuote?.total.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Currency</div>
                    <div className="px-3 py-2 text-sm font-extrabold text-slate-800">{deskQuote?.currency}</div>
                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Ex.Rate</div>
                    <div className="bg-[#FFFBEA] px-3 py-2">
                      <input
                        ref={(el) => {
                          cellRefs.current.fx = el
                        }}
                        onKeyDown={(e) =>
                          handleCellNav(e, {
                            enter: 'carrier',
                            down: 'carrier',
                          })
                        }
                        type="text"
                        className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-wac-orange"
                        value={fxDraft}
                        onChange={(e) => setFxDraft(e.target.value)}
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        Excel과 동일: Currency가 HKD이면 TOTAL × Ex.Rate (USD는 그대로)
                      </p>
                    </div>
                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Route</div>
                    <div className="px-3 py-2 text-sm font-bold text-slate-800">{deskQuote?.route}</div>
                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">C.W.</div>
                    <div className="px-3 py-2 text-sm font-extrabold text-emerald-800 bg-emerald-50 rounded">{
                      deskQuote?.cw.toFixed(2)
                    }</div>
                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Carrier</div>
                    <div className="bg-[#FFFBEA] px-3 py-2">
                      <input
                        ref={(el) => {
                          cellRefs.current.carrier = el
                        }}
                        onKeyDown={(e) =>
                          handleCellNav(e, {
                            enter: 'remark',
                            down: 'remark',
                            up: 'fx',
                          })
                        }
                        className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-sm font-bold uppercase text-slate-800 shadow-sm outline-none focus:border-wac-orange"
                        value={carrierCode}
                        onChange={(e) => setCarrierCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Remark</div>
                    <div className="bg-[#FFFBEA] px-3 py-2">
                      <input
                        ref={(el) => {
                          cellRefs.current.remark = el
                        }}
                        onKeyDown={(e) =>
                          handleCellNav(e, {
                            enter: `${deskQuote?.lines[0]?.id ?? 'air'}-exc`,
                            down: `${deskQuote?.lines[0]?.id ?? 'air'}-exc`,
                            up: 'carrier',
                          })
                        }
                        className="h-9 w-full rounded-md border border-amber-200 bg-white px-2 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-wac-orange"
                        value={deskRemark}
                        onChange={(e) => setDeskRemark(e.target.value)}
                        placeholder=""
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end border-t border-slate-100 bg-white px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setTab('quote')}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-wac-navy px-5 text-sm font-bold text-white hover:bg-[#243447]"
                  >
                    Next: Quotation
                  </button>
                </div>
              </div>
            )}
            {historyPanel}
          </div>
        ) : null}

        {tab === 'quote' ? (
          <div className="space-y-4">
            {historyNotice?.kind === 'open' ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                {historyNotice.text}
              </div>
            ) : null}
            {!deskQuote ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  No live quote yet. Reuse a history row into Input, or calculate from Input.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="mb-1 text-[11px] font-bold tracking-[0.22em] text-wac-orange uppercase">
                        Quotation
                      </p>
                      <p className="text-3xl font-black text-wac-navy sm:text-4xl">
                        {deskQuote.currency} {deskQuote.total.toFixed(2)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Route {deskQuote.route} · Break {deskQuote.breakLabel} ·
                        C.W. {deskQuote.cw.toFixed(2)} / CBM {deskQuote.cbm.toFixed(3)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {loadedHistoryPdfHtml ? (
                        <button
                          type="button"
                          onClick={openLoadedHistoryPdf}
                          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-wac-orange"
                        >
                          Open saved PDF quote
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void copyTable()}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-wac-orange"
                      >
                        Copy table
                      </button>
                      <button
                        type="button"
                        onClick={printPdf}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-wac-navy px-4 text-sm font-bold text-white hover:bg-[#243447]"
                      >
                        Save PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="grid grid-cols-[170px_1fr] gap-x-4 gap-y-2">
                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Route</div>
                    <div className="px-3 py-2 text-sm font-extrabold text-slate-800">{deskQuote.route}</div>

                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Cargo</div>
                    <div className="px-3 py-2 text-sm font-bold text-slate-800">{cargoSummary}</div>

                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">C.W.</div>
                    <div className="px-3 py-2 text-sm font-extrabold text-emerald-800 bg-emerald-50 rounded">
                      {deskQuote.cw.toFixed(2)} kg · Break {deskQuote.breakLabel}
                    </div>

                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Currency / FX</div>
                    <div className="px-3 py-2 text-sm font-bold text-slate-800">
                      {deskQuote.currency} · Ex.Rate {deskQuote.fx.toFixed(4)}
                    </div>

                    <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Carrier</div>
                    <div className="px-3 py-2 text-sm font-bold text-slate-800">{carrierCode}</div>

                    {deskRemark.trim() ? (
                      <>
                        <div className="bg-[#F4F7FB] px-3 py-2 text-xs font-bold text-slate-600">Remark</div>
                        <div className="px-3 py-2 text-sm font-bold text-slate-800">{deskRemark}</div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <p className="text-[11px] font-bold tracking-wider text-wac-navy uppercase">
                      Quotation
                    </p>
                  </div>
                  <div className="max-w-full overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-[13px]">
                      <thead>
                        <tr className="bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="px-3 py-2.5">Charge</th>
                          <th className="px-3 py-2.5">Unit</th>
                          <th className="px-3 py-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pdfLines.map((l) => (
                          <tr key={l.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold text-wac-navy">
                              {l.label}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {l.unit}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-800">
                              {deskQuote.currency} {l.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-[#F05023] bg-[#F05023]">
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-right text-[13px] font-extrabold text-white"
                          >
                            TOTAL APPX. AMOUNT
                          </td>
                          <td className="px-3 py-2 text-right text-[14px] font-black text-white">
                            {deskQuote.currency} {deskQuote.total.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-start border-t border-slate-100 bg-white px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setTab('input')}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:border-wac-orange"
                    >
                      Back: Input
                    </button>
                  </div>
                </div>
              </>
            )}
            {historyPanel}
          </div>
        ) : null}
      </main>

    </div>
  )
}
