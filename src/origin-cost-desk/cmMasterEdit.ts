import type { CmAirRate, CmLocalRate, CmMaster } from './cmExcelMaster'

export function cloneMaster(master: CmMaster): CmMaster {
  return {
    ...master,
    air: master.air.map((a) => ({ ...a })),
    local: master.local.map((l) => ({ ...l })),
  }
}

export function patchAirRoute(
  master: CmMaster,
  index: number,
  patch: Partial<CmAirRate>,
): CmMaster {
  const next = cloneMaster(master)
  if (index < 0 || index >= next.air.length) return next
  next.air[index] = { ...next.air[index], ...patch }
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
  next.air.push({
    route: row?.route?.trim().toUpperCase() || 'XXX-YYY',
    min: row?.min ?? 0,
    rUnder45: row?.rUnder45 ?? 0,
    r45: row?.r45 ?? 0,
    r100: row?.r100 ?? 0,
    r500: row?.r500 ?? 0,
    r1000: row?.r1000 ?? 0,
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
