/**
 * Excel ?낅젰 ?쒗듃: Master 李멸퀬(I) + ?덉쇅(J) ??TOTAL
 */
import type { CmLocalRate, CmMaster } from './cmExcelMaster'
import {
  DEFAULT_OTHER_LABELS,
  MASTER_OTHER_COUNT,
  TOTAL_OTHER_SLOTS,
  type CmExtraOther,
} from './cmDeskConfig'

export type CmDeskLine = {
  id: string
  label: string
  unit: string
  ref: number
  override: number | null
  amount: number
  group: 'air' | 'local' | 'variable'
  editableLabel?: boolean
  editableUnit?: boolean
  isOtherSlot?: boolean
  note?: string
}

export type CmCargoPiece = {
  length: number
  width: number
  height: number
  qty: number
  gross: number
}

export type CmDeskQuoteResult = {
  route: string
  cbm: number
  cw: number
  volumetric: number
  airMin: number
  fscPerKg: number
  sscPerKg: number
  gross: number
  qty: number
  breakLabel: string
  airRate: number
  currency: 'USD' | 'HKD'
  fx: number
  lines: CmDeskLine[]
  total: number
}

export type CmDeskQuoteInput = {
  origin: string
  destination: string
  length: number
  width: number
  height: number
  qty: number
  gross: number
  pieces?: CmCargoPiece[]
  blCount?: number
  fx?: number
  exceptions?: Record<string, number | null | undefined>
  otherLabels?: Record<string, string>
  otherUnits?: Record<string, string>
  extraOthers?: CmExtraOther[]
  disabledLineIds?: string[]
}

function pickLocal(master: CmMaster, name: string): CmLocalRate | undefined {
  return master.local.find((l) => l.item === name)
}

function pickAirRate(
  air: CmMaster['air'][number],
  breakLabel: string,
): number {
  const map: Record<string, number> = {
    '-45': air.rUnder45,
    '+45': air.r45,
    '+100': air.r100,
    '+500': air.r500,
    '+1000': air.r1000,
  }
  return map[breakLabel] ?? air.r45
}

function breakForCw(cw: number, master: CmMaster): string {
  if (cw < master.wb45) return '-45'
  if (cw >= master.wb1000) return '+1000'
  if (cw >= master.wb500) return '+500'
  if (cw >= master.wb100) return '+100'
  return '+45'
}

function useAmount(
  key: string,
  computed: number,
  exceptions: Record<string, number | null | undefined>,
): { ref: number; override: number | null; amount: number } {
  const ref = computed
  if (key in exceptions && exceptions[key] != null) {
    const override = Number(exceptions[key])
    return { ref, override, amount: override }
  }
  return { ref, override: null, amount: computed }
}

function line(
  id: string,
  label: string,
  unit: string,
  group: CmDeskLine['group'],
  ref: number,
  override: number | null,
  amount: number,
  extra?: Partial<CmDeskLine>,
): CmDeskLine {
  return {
    id,
    label,
    unit,
    ref,
    override,
    amount,
    group,
    ...extra,
  }
}

function otherLabel(labels: Record<string, string>, id: string): string {
  return labels[id]?.trim() || DEFAULT_OTHER_LABELS[id] || id
}

function otherUnit(units: Record<string, string>, id: string, fallback: string): string {
  return units[id]?.trim() || fallback
}

/** Master-linked Other 1?? auto refs (Excel ?낅젰 rows 25??0) */
function masterOtherRef(
  id: string,
  master: CmMaster,
  cw: number,
  bl: number,
  qty: number,
): number {
  switch (id) {
    case 'other1': {
      const m = pickLocal(master, 'XRAY')
      return m ? m.rate * cw : 0
    }
    case 'other2': {
      const m = pickLocal(master, 'CFS')
      return m ? Math.max(m.rate * cw, m.min) : 0
    }
    case 'other3': {
      const m = pickLocal(master, 'Pickup (temp)')
      return m ? m.min : 0
    }
    case 'other4': {
      const m = pickLocal(master, 'Export declaration')
      return m ? Math.max(m.rate * bl, m.min) * bl : 0
    }
    case 'other5': {
      const m = pickLocal(master, 'RE-PACKING')
      return m ? m.rate * qty : 0
    }
    case 'other6': {
      const m = pickLocal(master, 'Gate / parking / toll')
      return m ? m.min : 0
    }
    default:
      return 0
  }
}

const MASTER_OTHER_UNITS: Record<string, string> = {
  other1: 'Per KG',
  other2: 'Per KG',
  other3: 'Per Shipment',
  other4: 'Per Entry',
  other5: 'Per PLT',
  other6: 'Manual',
}

export function calcCmDeskQuote(
  master: CmMaster,
  input: CmDeskQuoteInput,
): CmDeskQuoteResult | null {
  const route = `${input.origin.trim().toUpperCase()}-${input.destination.trim().toUpperCase()}`
  const air = master.air.find((a) => a.route === route)
  if (!air) return null

  const exc = input.exceptions ?? {}
  const labels = input.otherLabels ?? {}
  const units = input.otherUnits ?? {}
  const bl = input.blCount ?? 1
  const fx = input.fx ?? 1
  const disabled = input.disabledLineIds ?? []
  const pieces = (input.pieces ?? []).filter(
    (piece) =>
      piece.length > 0 &&
      piece.width > 0 &&
      piece.height > 0 &&
      piece.qty > 0 &&
      piece.gross > 0,
  )

  const totalQty = pieces.length
    ? pieces.reduce((sum, piece) => sum + piece.qty, 0)
    : input.qty
  const gross = pieces.length
    ? pieces.reduce((sum, piece) => sum + piece.gross, 0)
    : input.gross
  const cbm = pieces.length
    ? pieces.reduce(
        (sum, piece) =>
          sum + (piece.length * piece.width * piece.height * piece.qty) / master.cbmDivisor,
        0,
      )
    : (input.length * input.width * input.height * input.qty) / master.cbmDivisor
  const volumetric = cbm * master.volFactor
  const cw = Math.max(gross, volumetric)
  const breakLabel = breakForCw(cw, master)
  const airRate = pickAirRate(air, breakLabel)
  const currency = air.currency ?? 'USD'

  const handlingM = pickLocal(master, 'Handling Fee')
  const docM = pickLocal(master, 'Doc Fee')
  const truckM = pickLocal(master, 'Trucking')
  const termM = pickLocal(master, 'Terminal Charge')

  const airAmt = useAmount('air', Math.max(airRate * cw, air.min), exc)
  const fscAmt = useAmount('fsc', air.fsc * cw, exc)
  const sscAmt = useAmount('ssc', air.ssc * cw, exc)
  const handlingAmt = useAmount(
    'handling',
    handlingM ? Math.max(handlingM.rate, handlingM.min) : 0,
    exc,
  )
  const docAmt = useAmount(
    'doc',
    docM ? Math.max(docM.rate, docM.min) * bl : 0,
    exc,
  )
  const truckingAmt = useAmount(
    'trucking',
    truckM ? Math.max(truckM.rate * cbm, truckM.min) : 0,
    exc,
  )
  const terminalAmt = useAmount(
    'terminal',
    termM ? Math.max(termM.rate * cw, termM.min) : 0,
    exc,
  )

  const lines: CmDeskLine[] = [
    line('air', 'Air Freight', 'Per KG', 'air', airAmt.ref, airAmt.override, airAmt.amount, {
      note: `${breakLabel} @ ${airRate}/kg`,
    }),
    line('fsc', 'FSC', 'Per KG', 'air', fscAmt.ref, fscAmt.override, fscAmt.amount),
    line('ssc', 'SSC', 'Per KG', 'air', sscAmt.ref, sscAmt.override, sscAmt.amount),
    line(
      'handling',
      'Handling Fee',
      handlingM?.unit ?? 'Per Shipment',
      'local',
      handlingAmt.ref,
      handlingAmt.override,
      handlingAmt.amount,
    ),
    line(
      'doc',
      'Doc Fee',
      docM?.unit ?? 'Per BL',
      'local',
      docAmt.ref,
      docAmt.override,
      docAmt.amount,
    ),
    line(
      'trucking',
      'Trucking',
      truckM?.unit ?? 'Per CBM',
      'local',
      truckingAmt.ref,
      truckingAmt.override,
      truckingAmt.amount,
    ),
    line(
      'terminal',
      'Terminal Charge',
      termM?.unit ?? 'Per KG',
      'local',
      terminalAmt.ref,
      terminalAmt.override,
      terminalAmt.amount,
    ),
  ]

  for (let i = 1; i <= TOTAL_OTHER_SLOTS; i++) {
    const id = `other${i}`
    if (disabled.includes(id)) continue
    const isMasterLinked = i <= MASTER_OTHER_COUNT
    const ref = isMasterLinked
      ? masterOtherRef(id, master, cw, bl, totalQty)
      : 0
    const amt = useAmount(id, ref, exc)
    lines.push(
      line(
        id,
        otherLabel(labels, id),
        otherUnit(units, id, MASTER_OTHER_UNITS[id] ?? 'Manual'),
        'variable',
        amt.ref,
        amt.override,
        amt.amount,
        {
          editableLabel: true,
          editableUnit: true,
          isOtherSlot: true,
        },
      ),
    )
  }

  for (const extra of input.extraOthers ?? []) {
    if (disabled.includes(extra.id)) continue
    const amt = useAmount(extra.id, 0, exc)
    lines.push(
      line(
        extra.id,
        extra.label.trim() || 'Other',
        extra.unit.trim() || 'Manual',
        'variable',
        amt.ref,
        amt.override,
        amt.amount,
        {
          editableLabel: true,
          editableUnit: true,
          isOtherSlot: true,
        },
      ),
    )
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  // fx is defined as USD?묱KD rate in the Excel sheet.
  // So only apply when the lane currency is USD.
  const total = subtotal * (currency === 'USD' ? fx : 1)

  return {
    route,
    cbm,
    cw,
    gross,
    qty: totalQty,
    volumetric,
    airMin: air.min,
    fscPerKg: air.fsc,
    sscPerKg: air.ssc,
    breakLabel,
    airRate,
    currency,
    fx,
    lines,
    total,
  }
}

export function parseCmExceptions(
  draft: Record<string, string>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [k, v] of Object.entries(draft)) {
    const t = v.trim()
    if (t === '') continue
    const n = Number(t)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}
