import type { CmAirRate, CmLocalRate, CmMaster, CmWeightBreak } from './cmExcelMaster'
import { DEFAULT_GCR_BREAKS, formatBreakLabel, syncBreakLabels } from './cmExcelMaster'

export function cloneMaster(master: CmMaster): CmMaster {
  return {
    ...master,
    breaks: master.breaks.map((b) => ({ ...b })),
    air: master.air.map((a) => ({ ...a, rates: [...a.rates] })),
    local: master.local.map((l) => ({ ...l })),
  }
}

function alignRates(air: CmAirRate, breakCount: number): number[] {
  const next = air.rates.slice(0, breakCount)
  while (next.length < breakCount) next.push(0)
  return next
}

function hasBreakKg(breaks: CmWeightBreak[], minKg: number, exceptId?: string): boolean {
  return breaks.some((b) => b.minKg === minKg && b.id !== exceptId)
}

export function patchAirRoute(
  master: CmMaster,
  index: number,
  patch: Partial<CmAirRate>,
): CmMaster {
  const next = cloneMaster(master)
  if (index < 0 || index >= next.air.length) return next
  next.air[index] = {
    ...next.air[index],
    ...patch,
    rates: alignRates(
      { rates: patch.rates ?? next.air[index].rates } as CmAirRate,
      next.breaks.length,
    ),
  }
  if (patch.route) {
    next.air[index].route = patch.route.trim().toUpperCase()
  }
  return next
}

export function patchLocalRate(
  master: CmMaster,
  index: number,
  patch: Partial<CmLocalRate>,
): CmMaster {
  const next = cloneMaster(master)
  if (index < 0 || index >= next.local.length) return next
  next.local[index] = { ...next.local[index], ...patch }
  return next
}

export function addAirRoute(master: CmMaster, row?: Partial<CmAirRate>): CmMaster {
  const next = cloneMaster(master)
  const breaks = next.breaks.length ? next.breaks : DEFAULT_GCR_BREAKS
  next.air.push({
    route: row?.route?.trim().toUpperCase() || 'XXX-YYY',
    min: row?.min ?? 0,
    rates: row?.rates?.length ? alignRates({ rates: row.rates } as CmAirRate, breaks.length) : breaks.map(() => 0),
    fsc: row?.fsc ?? 0,
    ssc: row?.ssc ?? 0,
    currency: row?.currency ?? 'USD',
  })
  return next
}

export function addLocalCharge(master: CmMaster, row?: Partial<CmLocalRate>): CmMaster {
  const next = cloneMaster(master)
  next.local.push({
    item: row?.item?.trim() || 'New charge',
    unit: row?.unit?.trim() || 'Manual',
    rate: row?.rate ?? 0,
    min: row?.min ?? 0,
  })
  return next
}

export function removeAirRoute(master: CmMaster, index: number): CmMaster {
  const next = cloneMaster(master)
  if (next.air.length <= 1) return next
  next.air.splice(index, 1)
  return next
}

export function removeLocalCharge(master: CmMaster, index: number): CmMaster {
  const next = cloneMaster(master)
  next.local.splice(index, 1)
  return next
}

function reorderAirRates(master: CmMaster, oldIds: string[]): CmMaster {
  const next = cloneMaster(master)
  next.air = next.air.map((row) => {
    const mapped = next.breaks.map((b) => {
      const i = oldIds.indexOf(b.id)
      return i >= 0 ? (row.rates[i] ?? 0) : 0
    })
    return { ...row, rates: mapped }
  })
  return next
}

export function patchWeightBreak(
  master: CmMaster,
  index: number,
  patch: Partial<CmWeightBreak>,
): CmMaster {
  if (index < 0 || index >= master.breaks.length) return master
  const oldIds = master.breaks.map((b) => b.id)
  const next = cloneMaster(master)
  const current = next.breaks[index]
  let minKg = current.minKg
  if (typeof patch.minKg === 'number' && Number.isFinite(patch.minKg)) {
    minKg = Math.max(0, patch.minKg)
  }
  if (hasBreakKg(next.breaks, minKg, current.id)) {
    return master
  }
  next.breaks[index] = { ...current, ...patch, minKg }
  next.breaks.sort((a, b) => a.minKg - b.minKg)
  next.breaks = syncBreakLabels(next.breaks)
  return reorderAirRates(next, oldIds)
}

export function addWeightBreak(master: CmMaster, minKg = 300): CmMaster | null {
  const kg = Math.max(0, minKg)
  if (hasBreakKg(master.breaks, kg)) return null
  const id = `wb-${kg}-${Date.now().toString(16)}`
  const oldIds = master.breaks.map((b) => b.id)
  const next = cloneMaster(master)
  next.breaks.push({
    id,
    minKg: kg,
    label: formatBreakLabel(kg, next.breaks.length + 1),
  })
  next.breaks.sort((a, b) => a.minKg - b.minKg)
  next.breaks = syncBreakLabels(next.breaks)
  return reorderAirRates(next, oldIds)
}

export function removeWeightBreak(master: CmMaster, index: number): CmMaster {
  if (master.breaks.length <= 1) return master
  if (index < 0 || index >= master.breaks.length) return master
  const oldIds = master.breaks.map((b) => b.id)
  const next = cloneMaster(master)
  next.breaks.splice(index, 1)
  next.breaks = syncBreakLabels(next.breaks)
  return reorderAirRates(next, oldIds)
}
