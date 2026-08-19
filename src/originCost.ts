/**
 * Origin (HK EXP) cost master from cost item_origin.xlsx
 * + variable truck slots from INV_AE260703101.pdf
 */

export type ChargeUnit = 'perkg' | 'perjob'

export type MasterCharge = {
  id: string
  label: string
  min: number
  flat: number
  unit: ChargeUnit
  /** conditional / optional line */
  optional?: boolean
}

/** EXP Local Charge — Mar 2026 master (HK sheet) */
export const EXP_LOCAL_MASTER: MasterCharge[] = [
  { id: 'terminal', label: 'Terminal Charge', min: 60, flat: 1.68, unit: 'perkg' },
  { id: 'document', label: 'Airline Document', min: 15, flat: 0, unit: 'perjob' },
  { id: 'handling', label: 'Agent Handling', min: 150, flat: 0, unit: 'perjob' },
  { id: 'cfs', label: 'CFS', min: 160, flat: 1.2, unit: 'perkg' },
  {
    id: 'uld',
    label: 'ULD Build up',
    min: 0,
    flat: 0.7,
    unit: 'perkg',
    optional: true,
  },
  {
    id: 'xray',
    label: 'X-ray Screening',
    min: 150,
    flat: 1.2,
    unit: 'perkg',
    optional: true,
  },
  {
    id: 'dg',
    label: 'MAWB DG Charge',
    min: 500,
    flat: 0,
    unit: 'perjob',
    optional: true,
  },
  {
    id: 'whReg',
    label: 'Warehouse Registration',
    min: 450,
    flat: 0,
    unit: 'perjob',
    optional: true,
  },
]

/** Desk-only slots — not in Excel master; appear on real HK invoices */
export const VARIABLE_SLOT_DEFAULTS = {
  cartage: 650,
  tunnel: 16,
  parking: 15,
  other: 0,
} as const

export const ALWAYS_ON_LOCAL = EXP_LOCAL_MASTER.filter((c) => !c.optional)

export const MASTER_VALIDITY = {
  effective: '2026-03-01',
  expiry: '2026-03-31',
  note: 'Roll over monthly — same pattern as cost item_origin.xlsx',
} as const

/** Default FX used on INV_AE260703101 (USD → HKD) — live fetch overrides in Desk UI */
export { DEFAULT_USD_HKD } from './fx'

export function calcLineAmount(
  charge: Pick<MasterCharge, 'min' | 'flat' | 'unit'>,
  cw: number,
): number {
  if (charge.unit === 'perjob') return charge.min
  return Math.max(charge.min, charge.flat * cw)
}

export type DeskFlags = {
  xray: boolean
  uld: boolean
  dg: boolean
  whReg: boolean
}

export type VariableSlots = {
  cartage: number
  tunnel: number
  parking: number
  other: number
  otherLabel: string
}

/** Excel 예외 — Master 자동 금액을 이 건만 덮어씀 */
export type LineOverrides = Partial<Record<string, number>>

/** Excel Other 1–n — 이름+금액으로 줄을 추가 */
export type ExtraCharge = {
  id: string
  label: string
  amount: number
}

export type CostLine = {
  id: string
  label: string
  amount: number
  currency: 'HKD' | 'USD'
  group: 'air' | 'local' | 'variable'
  note?: string
}

export function buildDeskCostSheet(opts: {
  cw: number
  airUsd: number
  airLabel: string
  flags: DeskFlags
  slots: VariableSlots
  usdHkd: number
  overrides?: LineOverrides
  extraLines?: ExtraCharge[]
}): {
  lines: CostLine[]
  localHkd: number
  variableHkd: number
  airHkd: number
  totalHkd: number
  totalUsd: number
} {
  const {
    cw,
    airUsd,
    airLabel,
    flags,
    slots,
    usdHkd,
    overrides = {},
    extraLines = [],
  } = opts
  const lines: CostLine[] = []

  lines.push({
    id: 'air',
    label: airLabel,
    amount: airUsd,
    currency: 'USD',
    group: 'air',
    note: `FX ${usdHkd.toFixed(4)}`,
  })

  for (const c of EXP_LOCAL_MASTER) {
    if (c.optional) {
      if (c.id === 'xray' && !flags.xray) continue
      if (c.id === 'uld' && !flags.uld) continue
      if (c.id === 'dg' && !flags.dg) continue
      if (c.id === 'whReg' && !flags.whReg) continue
    }
    const auto = calcLineAmount(c, cw)
    const over = overrides[c.id]
    const used = typeof over === 'number' && Number.isFinite(over) ? over : auto
    if (used <= 0) continue
    lines.push({
      id: c.id,
      label: c.label,
      amount: used,
      currency: 'HKD',
      group: 'local',
      note:
        typeof over === 'number' && Number.isFinite(over)
          ? `Exception this job (auto ${auto.toFixed(2)})`
          : c.unit === 'perjob'
            ? 'per job (min)'
            : `max(min ${c.min}, ${c.flat}/kg × ${cw.toFixed(1)})`,
    })
  }

  const variableDefs: { id: keyof VariableSlots; label: string }[] = [
    { id: 'cartage', label: 'Cartage / Trucking' },
    { id: 'tunnel', label: 'Tunnel Fee' },
    { id: 'parking', label: 'Parking Fee' },
  ]

  for (const v of variableDefs) {
    const amount = Number(slots[v.id]) || 0
    if (amount <= 0) continue
    lines.push({
      id: v.id,
      label: v.label,
      amount,
      currency: 'HKD',
      group: 'variable',
      note: 'Desk slot — enter per shipment',
    })
  }

  if ((Number(slots.other) || 0) > 0) {
    lines.push({
      id: 'other',
      label: slots.otherLabel.trim() || 'Other / Ad-hoc',
      amount: Number(slots.other),
      currency: 'HKD',
      group: 'variable',
      note: 'Desk slot',
    })
  }

  for (const extra of extraLines) {
    const amount = Number(extra.amount) || 0
    if (amount <= 0) continue
    lines.push({
      id: extra.id,
      label: extra.label.trim() || 'Other',
      amount,
      currency: 'HKD',
      group: 'variable',
      note: 'Added this job',
    })
  }

  const localHkd = lines
    .filter((l) => l.group === 'local')
    .reduce((s, l) => s + l.amount, 0)
  const variableHkd = lines
    .filter((l) => l.group === 'variable')
    .reduce((s, l) => s + l.amount, 0)
  const airHkd = airUsd * usdHkd
  const totalHkd = airHkd + localHkd + variableHkd
  const totalUsd = totalHkd / usdHkd

  return { lines, localHkd, variableHkd, airHkd, totalHkd, totalUsd }
}
