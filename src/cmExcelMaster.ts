/**
 * Parse CM Quotation Simulator Master_DB (Excel) for portfolio web link.
 * Sheet layout must match excel-quote/WAC_Air_Quotation_Simulator.xlsx
 */

import * as XLSX from 'xlsx'

export type CmAirRate = {
  route: string
  min: number
  rUnder45: number
  r45: number
  r100: number
  r500: number
  r1000: number
  fsc: number
  ssc: number
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
  wb45: number
  wb100: number
  wb500: number
  wb1000: number
  air: CmAirRate[]
  local: CmLocalRate[]
  fileName: string
}

export type CmQuoteResult = {
  route: string
  cbm: number
  volKg: number
  cw: number
  breakLabel: string
  airRate: number
  airFreight: number
  fsc: number
  ssc: number
  handling: number
  doc: number
  trucking: number
  total: number
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function cell(rows: unknown[][], r: number, c: number): unknown {
  return rows[r]?.[c]
}

/** 0-based row/col from worksheet AOA */
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

  const air: CmAirRate[] = []
  // Find ROUTE header then read consecutive data rows
  let airHeader = -1
  for (let r = 0; r < rows.length; r++) {
    if (String(cell(rows, r, 0) ?? '').trim().toUpperCase() === 'ROUTE') {
      airHeader = r
      break
    }
  }
  if (airHeader >= 0) {
    for (let r = airHeader + 1; r < rows.length; r++) {
      const route = String(cell(rows, r, 0) ?? '').trim()
      if (!route || route.startsWith('2.') || route.includes('Local')) break
      if (!route.includes('-')) break
      air.push({
        route,
        min: num(cell(rows, r, 1)),
        rUnder45: num(cell(rows, r, 2)),
        r45: num(cell(rows, r, 3)),
        r100: num(cell(rows, r, 4)),
        r500: num(cell(rows, r, 5)),
        r1000: num(cell(rows, r, 6)),
        fsc: num(cell(rows, r, 7)),
        ssc: num(cell(rows, r, 8)),
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
    wb45: num(cell(rows, 8, 1), 45),
    wb100: num(cell(rows, 9, 1), 100),
    wb500: num(cell(rows, 10, 1), 500),
    wb1000: num(cell(rows, 11, 1), 1000),
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

function pickLocal(master: CmMaster, name: string): CmLocalRate | undefined {
  return master.local.find((l) => l.item === name)
}

export function calcCmQuote(
  master: CmMaster,
  opts: {
    origin: string
    destination: string
    length: number
    width: number
    height: number
    qty: number
    gross: number
    blCount?: number
  },
): CmQuoteResult | null {
  const route = `${opts.origin.trim().toUpperCase()}-${opts.destination.trim().toUpperCase()}`
  const air = master.air.find((a) => a.route === route)
  if (!air) return null

  const cbm =
    (opts.length * opts.width * opts.height * opts.qty) / master.cbmDivisor
  const volKg = cbm * master.volFactor
  const cw = Math.max(opts.gross, volKg)

  let breakLabel = '+45'
  let airRate = air.r45
  if (cw < master.wb45) {
    breakLabel = '-45'
    airRate = air.rUnder45
  } else if (cw >= master.wb1000) {
    breakLabel = '+1000'
    airRate = air.r1000
  } else if (cw >= master.wb500) {
    breakLabel = '+500'
    airRate = air.r500
  } else if (cw >= master.wb100) {
    breakLabel = '+100'
    airRate = air.r100
  }

  const airFreight = Math.max(airRate * cw, air.min)
  const fsc = air.fsc * cw
  const ssc = air.ssc * cw

  const handlingRow = pickLocal(master, 'Handling Fee')
  const docRow = pickLocal(master, 'Doc Fee')
  const truckRow = pickLocal(master, 'Trucking')

  const handling = handlingRow
    ? Math.max(handlingRow.rate, handlingRow.min)
    : 0
  const bl = opts.blCount ?? 1
  const doc = docRow ? Math.max(docRow.rate, docRow.min) * bl : 0
  const trucking = truckRow
    ? Math.max(truckRow.rate * cbm, truckRow.min)
    : 0

  return {
    route,
    cbm,
    volKg,
    cw,
    breakLabel,
    airRate,
    airFreight,
    fsc,
    ssc,
    handling,
    doc,
    trucking,
    total: airFreight + fsc + ssc + handling + doc + trucking,
  }
}
