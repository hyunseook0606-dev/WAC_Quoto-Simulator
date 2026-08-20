import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { parseCmMasterFromWorkbook } from '../src/origin-cost-desk/cmExcelMaster.ts'
import { calcCmDeskQuote } from '../src/origin-cost-desk/cmDeskQuote.ts'

const buf = readFileSync('public/excel/WAC_Air_Quotation_Simulator.xlsx')
const wb = XLSX.read(buf, { type: 'buffer' })
const master = parseCmMasterFromWorkbook(wb, 'WAC_Air_Quotation_Simulator.xlsx')

const icnHkg = master.air.find((a) => a.route === 'ICN-HKG')
console.log('ICN-HKG master:', JSON.stringify(icnHkg, null, 2))
console.log('Breaks:', master.breaks.map((b) => `${b.label}@${b.minKg}`).join(', '))

type Case = {
  name: string
  input: Parameters<typeof calcCmDeskQuote>[1] & { _terminalNote?: string }
  expect: {
    cw?: number
    breakLabel?: string
    airRate?: number
    airAmountMin?: number
    truckingMin?: number
    terminalAmount?: number
    total?: number
  }
}

const cases: Case[] = [
  {
    name: 'CASE A — Volume cargo (ICN-HKG)',
    input: {
      origin: 'ICN',
      destination: 'HKG',
      length: 110,
      width: 110,
      height: 150,
      qty: 3,
      gross: 400,
      fx: 1,
      blCount: 1,
    },
    expect: {
      cw: 909.32,
      breakLabel: '+500',
      airRate: 3.2,
    },
  },
  {
    name: 'CASE B — Heavy cargo (ICN-HKG)',
    input: {
      origin: 'ICN',
      destination: 'HKG',
      length: 30,
      width: 30,
      height: 30,
      qty: 1,
      gross: 80,
      fx: 1,
      blCount: 1,
    },
    expect: {
      cw: 80,
      breakLabel: '+45',
      airRate: 4.5,
    },
  },
  {
    name: 'CASE C — MIN floor (ICN-HKG)',
    input: {
      origin: 'ICN',
      destination: 'HKG',
      length: 20,
      width: 20,
      height: 20,
      qty: 1,
      gross: 3,
      fx: 1,
      blCount: 1,
    },
    expect: {
      airAmountMin: 50,
      truckingMin: 80,
    },
  },
  {
    // Excel M14 = Σ MAX(GW, CBM×167) per slot — not max(ΣGW, ΣCBM×167)
    // Slot1: 30³ / 1e6 ×167 ≈ 4.5 → CW 200
    // Slot2: 100³ / 1e6 ×167 = 167 → CW 167
    // Total CW = 367 (old bug would yield 210)
    name: 'CASE D — Mixed multi-piece C.W. (Excel M14)',
    input: {
      origin: 'ICN',
      destination: 'HKG',
      length: 30,
      width: 30,
      height: 30,
      qty: 1,
      gross: 200,
      fx: 1,
      blCount: 1,
      pieces: [
        { length: 30, width: 30, height: 30, qty: 1, gross: 200 },
        { length: 100, width: 100, height: 100, qty: 1, gross: 10 },
      ],
    },
    expect: {
      cw: 367,
      breakLabel: '+100',
      airRate: 3.8,
    },
  },
  {
    name: 'CASE E — Chocolate HKG-ICN (KEEP COOL)',
    input: {
      origin: 'HKG',
      destination: 'ICN',
      length: 110,
      width: 110,
      height: 109,
      qty: 1,
      gross: 194.5,
      fx: 1,
      blCount: 1,
      exceptions: {
        handling: 321,
        doc: 15,
        trucking: 0,
      },
    },
    expect: {
      cw: 220.26,
      breakLabel: '+100',
      airRate: 25,
      total: 10048.75,
    },
  },
  {
    // Terminal note "G.W. kg" → Per KG on gross weight (Excel col E), not C.W.
    name: 'CASE F — Terminal on G.W. (note override)',
    input: {
      origin: 'ICN',
      destination: 'HKG',
      length: 110,
      width: 110,
      height: 150,
      qty: 3,
      gross: 400,
      fx: 1,
      blCount: 1,
      _terminalNote: 'G.W. kg, MIN',
    },
    expect: {
      terminalAmount: 672,
    },
  },
]

let failed = 0
for (const c of cases) {
  console.log('\n' + '='.repeat(60))
  console.log(c.name)
  const { _terminalNote, ...input } = c.input
  const caseMaster = _terminalNote
    ? structuredClone(master)
    : master
  if (_terminalNote) {
    const term = caseMaster.local.find((l) => l.item.includes('Terminal'))
    if (term) term.note = _terminalNote
  }
  const q = calcCmDeskQuote(caseMaster, input)
  if (!q) {
    console.log('FAIL: no quote (route missing?)')
    failed++
    continue
  }
  const airLine = q.lines.find((l) => l.id === 'air')
  const truckingLine = q.lines.find((l) => l.id === 'trucking')
  const terminalLine = q.lines.find((l) => l.id === 'terminal')

  console.log({
    cbm: q.cbm.toFixed(4),
    volumetric: q.volumetric.toFixed(2),
    cw: q.cw.toFixed(4),
    breakLabel: q.breakLabel,
    airRate: q.airRate,
    airMin: q.airMin,
    airAmount: airLine?.amount,
    truckingAmount: truckingLine?.amount,
    terminalAmount: terminalLine?.amount,
    allInPerKg: q.allInPerKg,
    currency: q.currency,
    total: q.total.toFixed(2),
  })

  const checks: string[] = []
  if (c.expect.cw != null) {
    const ok = Math.abs(q.cw - c.expect.cw) < 0.05
    checks.push(`C.W. ${q.cw.toFixed(2)} ≈ ${c.expect.cw} → ${ok ? 'OK' : 'FAIL'}`)
    if (!ok) failed++
  }
  if (c.expect.breakLabel) {
    const ok = q.breakLabel === c.expect.breakLabel
    checks.push(`Break ${q.breakLabel} = ${c.expect.breakLabel} → ${ok ? 'OK' : 'FAIL'}`)
    if (!ok) failed++
  }
  if (c.expect.airRate != null) {
    const ok = Math.abs(q.airRate - c.expect.airRate) < 0.01
    checks.push(`Air rate ${q.airRate} = ${c.expect.airRate} → ${ok ? 'OK' : 'FAIL'}`)
    if (!ok) failed++
  }
  if (c.expect.airAmountMin != null) {
    const amt = airLine?.amount ?? 0
    const ok = amt >= c.expect.airAmountMin - 0.01
    checks.push(`Air amount ${amt} ≥ MIN ${c.expect.airAmountMin} → ${ok ? 'OK' : 'FAIL'}`)
    if (!ok) failed++
  }
  if (c.expect.truckingMin != null) {
    const amt = truckingLine?.amount ?? 0
    const ok = amt >= c.expect.truckingMin - 0.01
    checks.push(`Trucking ${amt} ≥ MIN ${c.expect.truckingMin} → ${ok ? 'OK' : 'FAIL'}`)
    if (!ok) failed++
  }
  if (c.expect.terminalAmount != null) {
    const amt = terminalLine?.amount ?? 0
    const ok = Math.abs(amt - c.expect.terminalAmount) < 0.05
    checks.push(`Terminal ${amt.toFixed(2)} ≈ ${c.expect.terminalAmount} → ${ok ? 'OK' : 'FAIL'}`)
    if (!ok) failed++
  }
  if (c.expect.total != null) {
    const ok = Math.abs(q.total - c.expect.total) < 0.05
    checks.push(`TOTAL ${q.total.toFixed(2)} ≈ ${c.expect.total} → ${ok ? 'OK' : 'FAIL'}`)
    if (!ok) failed++
  }
  checks.forEach((line) => console.log(' ', line))
}

console.log('\n' + (failed ? `FAILED ${failed} check(s)` : 'ALL CASES PASSED'))
process.exit(failed ? 1 : 0)
