/**
 * Excel 입력 시트: Master 참고(I) + 예외(J) → TOTAL
 */
import type { CmLocalRate, CmMaster } from './cmExcelMaster'
import { pickWeightBreak, rateForBreak } from './cmExcelMaster'
import { type CmExtraOther } from './cmDeskConfig'

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
  editableRef?: boolean
  isOtherSlot?: boolean
  fromMasterLocal?: boolean
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
  refOverrides?: Record<string, number | null | undefined>
  otherLabels?: Record<string, string>
  otherUnits?: Record<string, string>
  extraOthers?: CmExtraOther[]
  disabledLineIds?: string[]
}

export function localLineId(item: string): string {
  const known: Record<string, string> = {
    'Handling Fee': 'handling',
    'Doc Fee': 'doc',
    Trucking: 'trucking',
    'Terminal Charge': 'terminal',
    XRAY: 'xray',
    CFS: 'cfs',
    'Pickup (temp)': 'pickup',
    'Export declaration': 'export',
    'RE-PACKING': 'repack',
    'Gate / parking / toll': 'gate',
  }
  if (known[item]) return known[item]
  return `local-${item
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

function useAmount(
  key: string,
  computed: number,
  exceptions: Record<string, number | null | undefined>,
  refOverrides: Record<string, number | null | undefined>,
): { ref: number; override: number | null; amount: number } {
  const ref =
    key in refOverrides && refOverrides[key] != null
      ? Number(refOverrides[key])
      : computed
  if (key in exceptions && exceptions[key] != null) {
    const override = Number(exceptions[key])
    return { ref, override, amount: override }
  }
  return { ref, override: null, amount: ref }
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

/** Master local 참고(I): unit 기준으로 Excel 입력 시트와 같은 과금 */
export function localMasterRef(
  item: CmLocalRate,
  ctx: { cw: number; cbm: number; bl: number; qty: number },
): number {
  const unit = item.unit.toUpperCase()
  if (unit.includes('CBM')) return Math.max(item.rate * ctx.cbm, item.min)
  if (unit.includes('KG') || unit.includes('C.W')) {
    return Math.max(item.rate * ctx.cw, item.min)
  }
  if (unit.includes('BL') || unit.includes('ENTRY')) {
    return Math.max(item.rate, item.min) * ctx.bl
  }
  if (unit.includes('PLT')) return item.rate * ctx.qty
  return Math.max(item.rate, item.min)
}

export function calcCmDeskQuote(
  master: CmMaster,
  input: CmDeskQuoteInput,
): CmDeskQuoteResult | null {
  const route = `${input.origin.trim().toUpperCase()}-${input.destination.trim().toUpperCase()}`
  const air = master.air.find((a) => a.route === route)
  if (!air) return null

  const exc = input.exceptions ?? {}
  const refOverrides = input.refOverrides ?? {}
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
  const picked = pickWeightBreak(cw, master.breaks)
  const breakLabel = picked?.label ?? ''
  const airRate = picked ? rateForBreak(air, master.breaks, picked.id) : 0
  const currency = air.currency ?? 'USD'
  const ctx = { cw, cbm, bl, qty: totalQty }

  const airAmt = useAmount('air', Math.max(airRate * cw, air.min), exc, refOverrides)
  const fscAmt = useAmount('fsc', air.fsc * cw, exc, refOverrides)
  const sscAmt = useAmount('ssc', air.ssc * cw, exc, refOverrides)

  const lines: CmDeskLine[] = [
    line('air', 'Air Freight', 'Per KG', 'air', airAmt.ref, airAmt.override, airAmt.amount, {
      note: `${breakLabel} @ ${airRate}/kg`,
    }),
    line('fsc', 'FSC', 'Per KG', 'air', fscAmt.ref, fscAmt.override, fscAmt.amount),
    line('ssc', 'SSC', 'Per KG', 'air', sscAmt.ref, sscAmt.override, sscAmt.amount),
  ]

  for (const local of master.local) {
    const id = localLineId(local.item)
    if (disabled.includes(id)) continue
    const unit = units[id]?.trim() || local.unit
    const computed = localMasterRef({ ...local, unit }, ctx)
    const amt = useAmount(id, computed, exc, refOverrides)
    lines.push(
      line(id, local.item, unit, 'local', amt.ref, amt.override, amt.amount, {
        editableUnit: true,
        editableRef: true,
        fromMasterLocal: true,
      }),
    )
  }

  for (const extra of input.extraOthers ?? []) {
    if (disabled.includes(extra.id)) continue
    const label = labels[extra.id]?.trim() || extra.label.trim() || 'Other'
    const unit = units[extra.id]?.trim() || extra.unit.trim() || 'Manual'
    const amt = useAmount(extra.id, 0, exc, refOverrides)
    lines.push(
      line(extra.id, label, unit, 'variable', amt.ref, amt.override, amt.amount, {
        editableLabel: true,
        editableUnit: true,
        editableRef: true,
        isOtherSlot: true,
      }),
    )
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  // Excel 입력 TOTAL: *IF(Currency="HKD", Ex.Rate, 1)
  const total = subtotal * (currency === 'HKD' ? fx : 1)

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
