/**
 * Parse Master_DB from the Excel simulator.
 * Weight breaks default to GCR (-45/+45/+100/+500/+1000) but are not hardcoded
 * in the desk: headers and the Master UI can add +300, +2000, FLAT, etc.
 */

import * as XLSX from 'xlsx'

export type CmWeightBreak = {
  id: string
  /** Inclusive lower bound in kg. Highest matching minKg wins. */
  minKg: number
  label: string
}

export type CmAirRate = {
  route: string
  min: number
  /** Parallel to master.breaks */
  rates: number[]
  fsc: number
  ssc: number
  currency: 'USD' | 'HKD'
}

export type CmLocalRate = {
  item: string
  unit: string
  rate: number
  min: number
}

export type CmMaster = {
  volFactor: number
  cbmDivisor: number
  breaks: CmWeightBreak[]
  air: CmAirRate[]
  local: CmLocalRate[]
  fileName: string
}

export const DEFAULT_GCR_BREAKS: CmWeightBreak[] = [
  { id: 'wb-0', minKg: 0, label: '-45' },
  { id: 'wb-45', minKg: 45, label: '+45' },
  { id: 'wb-100', minKg: 100, label: '+100' },
  { id: 'wb-500', minKg: 500, label: '+500' },
  { id: 'wb-1000', minKg: 1000, label: '+1000' },
]

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function cell(rows: unknown[][], r: number, c: number): unknown {
  return rows[r]?.[c]
}

export function parseBreakHeader(raw: string, index: number): CmWeightBreak | null {
  const t = raw.trim()
  if (!t) return null
  const upper = t.toUpperCase()
  if (upper === 'MIN' || upper === 'ROUTE' || upper.startsWith('FSC') || upper.startsWith('SSC') || upper === 'CUR') {
    return null
  }
  if (upper === 'FLAT' || upper.startsWith('FLAT')) {
    return { id: `wb-flat-${index}`, minKg: 0, label: t }
  }
  const m = t.match(/^([+-])?\s*(\d+(?:\.\d+)?)/)
  if (!m) {
    return { id: `wb-${index}`, minKg: 0, label: t }
  }
  const n = Number(m[2])
  if (m[1] === '-') {
    return { id: `wb-u-${n}-${index}`, minKg: 0, label: t.startsWith('-') ? t : `-${n}` }
  }
  return {
    id: `wb-${n}-${index}`,
    minKg: n,
    label: t.startsWith('+') ? t : `+${n}`,
  }
}

export function pickWeightBreak(
  cw: number,
  breaks: CmWeightBreak[],
): CmWeightBreak | null {
  if (!breaks.length) return null
  const byHigh = [...breaks].sort((a, b) => b.minKg - a.minKg)
  return byHigh.find((b) => cw >= b.minKg) ?? [...breaks].sort((a, b) => a.minKg - b.minKg)[0]
}

export function rateForBreak(
  air: CmAirRate,
  breaks: CmWeightBreak[],
  breakId: string,
): number {
  const i = breaks.findIndex((b) => b.id === breakId)
  if (i < 0) return air.rates[air.rates.length - 1] ?? 0
  return air.rates[i] ?? 0
}

function alignRateArray(rates: number[] | undefined, count: number): number[] {
  const next = (rates ?? []).slice(0, count)
  while (next.length < count) next.push(0)
  return next
}

export function isPersistedMaster(value: unknown): value is CmMaster {
  if (!value || typeof value !== 'object') return false
  const m = value as Partial<CmMaster>
  return (
    Array.isArray(m.breaks) &&
    m.breaks.length > 0 &&
    m.breaks.every(
      (b) =>
        b &&
        typeof b.id === 'string' &&
        typeof b.minKg === 'number' &&
        Number.isFinite(b.minKg) &&
        typeof b.label === 'string',
    ) &&
    Array.isArray(m.air) &&
    m.air.length > 0 &&
    Array.isArray(m.local)
  )
}

export function normalizeMaster(master: CmMaster): CmMaster {
  const breaks = (master.breaks?.length ? master.breaks : DEFAULT_GCR_BREAKS).map(
    (b, i) => ({
      id: b.id || `wb-${i}`,
      minKg: Math.max(0, Number(b.minKg) || 0),
      label: String(b.label || `+${b.minKg || 0}`),
    }),
  )
  return {
    volFactor: master.volFactor || 167,
    cbmDivisor: master.cbmDivisor || 1_000_000,
    breaks,
    air: master.air.map((row) => ({
      route: String(row.route || '').trim().toUpperCase(),
      min: Number(row.min) || 0,
      rates: alignRateArray(row.rates, breaks.length),
      fsc: Number(row.fsc) || 0,
      ssc: Number(row.ssc) || 0,
      currency: row.currency === 'HKD' ? 'HKD' : 'USD',
    })),
    local: (master.local ?? []).map((row) => ({
      item: String(row.item || ''),
      unit: String(row.unit || ''),
      rate: Number(row.rate) || 0,
      min: Number(row.min) || 0,
    })),
    fileName: master.fileName || 'Master_DB',
  }
}

export function parseCmMasterFromWorkbook(
  wb: XLSX.WorkBook,
  fileName: string,
): CmMaster {
  const sheet = wb.Sheets['Master_DB']
  if (!sheet) {
    throw new Error('Master_DB sheet not found')
  }
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][]

  let airHeader = -1
  for (let r = 0; r < rows.length; r++) {
    if (String(cell(rows, r, 0) ?? '').trim().toUpperCase() === 'ROUTE') {
      airHeader = r
      break
    }
  }

  let breaks = DEFAULT_GCR_BREAKS.map((b) => ({ ...b }))
  const air: CmAirRate[] = []

  if (airHeader >= 0) {
    const headerRow = rows[airHeader] ?? []
    const labels = headerRow.map((v) => String(v ?? '').trim())
    const fscIdx = labels.findIndex((h) => h.toUpperCase().startsWith('FSC'))
    const sscIdx = labels.findIndex((h) => h.toUpperCase().startsWith('SSC'))
    const curIdx = labels.findIndex((h) => h.toUpperCase() === 'CUR' || h.toUpperCase() === 'CURRENCY')
    const breakEnd = fscIdx > 1 ? fscIdx : 7
    const parsed: CmWeightBreak[] = []
    for (let c = 2; c < breakEnd; c++) {
      const br = parseBreakHeader(labels[c] ?? '', c)
      if (br) parsed.push(br)
    }
    if (parsed.length) breaks = parsed

    const fscCol = fscIdx >= 0 ? fscIdx : 2 + breaks.length
    const sscCol = sscIdx >= 0 ? sscIdx : fscCol + 1
    const curCol = curIdx >= 0 ? curIdx : sscCol + 1

    for (let r = airHeader + 1; r < rows.length; r++) {
      const route = String(cell(rows, r, 0) ?? '').trim()
      if (!route || route.startsWith('2.') || route.includes('Local')) break
      if (!route.includes('-')) break
      const curRaw = String(cell(rows, r, curCol) ?? '').trim().toUpperCase()
      const origin = route.split('-')[0]?.toUpperCase() ?? ''
      const currency: 'USD' | 'HKD' =
        curRaw === 'USD' || curRaw === 'HKD'
          ? curRaw
          : origin === 'HKG'
            ? 'HKD'
            : 'USD'
      const rates = breaks.map((_, i) => num(cell(rows, r, 2 + i)))
      air.push({
        route,
        min: num(cell(rows, r, 1)),
        rates,
        fsc: num(cell(rows, r, fscCol)),
        ssc: num(cell(rows, r, sscCol)),
        currency,
      })
    }
  }

  const local: CmLocalRate[] = []
  let localHeader = -1
  for (let r = 0; r < rows.length; r++) {
    if (String(cell(rows, r, 0) ?? '').trim() === 'Charge Item') {
      localHeader = r
      break
    }
  }
  if (localHeader >= 0) {
    for (let r = localHeader + 1; r < rows.length; r++) {
      const item = String(cell(rows, r, 0) ?? '').trim()
      if (!item || item.startsWith('구간') || item.startsWith('행')) break
      local.push({
        item,
        unit: String(cell(rows, r, 1) ?? ''),
        rate: num(cell(rows, r, 2)),
        min: num(cell(rows, r, 3)),
      })
    }
  }

  if (!air.length) {
    throw new Error('No air rates found in Master_DB')
  }

  return {
    volFactor: num(cell(rows, 4, 1), 167),
    cbmDivisor: num(cell(rows, 5, 1), 1_000_000),
    breaks,
    air,
    local,
    fileName,
  }
}

export async function parseCmMasterFile(file: File): Promise<CmMaster> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseCmMasterFromWorkbook(wb, file.name)
}
