import { Plus, Trash2 } from 'lucide-react'
import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { CmAirRate, CmMaster } from '../cmExcelMaster'
import {
  addAirRoute,
  addLocalCharge,
  patchAirRoute,
  patchLocalRate,
  removeAirRoute,
  removeLocalCharge,
} from '../cmMasterEdit'

type Props = {
  master: CmMaster
  onChange: (next: CmMaster) => void
}

export function CmMasterEditor({ master, onChange }: Props) {
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})

  const focusCell = (id?: string) => {
    if (!id) return
    const el = cellRefs.current[id]
    if (!el) return
    el.focus()
    if ('select' in el) el.select()
  }

  const handleNav = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
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

  const patchAir = (i: number, patch: Partial<CmAirRate>) => {
    onChange(patchAirRoute(master, i, patch))
  }

  const patchLocal = (
    i: number,
    patch: Partial<(typeof master.local)[number]>,
  ) => {
    onChange(patchLocalRate(master, i, patch))
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="px-4 pt-4 text-[10px] font-bold tracking-wider text-wac-navy uppercase">
            Air routes (Master_DB)
          </p>
          <button
            type="button"
            onClick={() => onChange(addAirRoute(master))}
            className="mr-4 inline-flex items-center gap-1 text-[10px] font-bold text-wac-orange uppercase hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add route
          </button>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[820px] text-left text-[11px]">
            <thead>
              <tr className="bg-[#1A2A3A] text-[9px] font-bold uppercase tracking-wider text-white/80">
                <th className="px-2 py-2">Route</th>
                <th className="px-2 py-2">MIN</th>
                <th className="px-2 py-2">-45</th>
                <th className="px-2 py-2">+45</th>
                <th className="px-2 py-2">+100</th>
                <th className="px-2 py-2">+500</th>
                <th className="px-2 py-2">+1000</th>
                <th className="px-2 py-2">FSC</th>
                <th className="px-2 py-2">SSC</th>
                <th className="min-w-[78px] px-2 py-2">CUR</th>
                <th className="w-8 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {master.air.map((row, i) => (
                <tr key={`${row.route}-${i}`} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/50">
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => {
                        cellRefs.current[`air-${i}-route`] = el
                      }}
                      type="text"
                      value={row.route}
                      onChange={(e) =>
                        patchAir(i, { route: e.target.value.toUpperCase() })
                      }
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `air-${i + 1 < master.air.length ? i + 1 : 0}-route`,
                          down: `air-${i + 1 < master.air.length ? i + 1 : 0}-route`,
                          right: `air-${i}-min`,
                        })
                      }
                      className="h-8 w-full min-w-[80px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-bold uppercase outline-none focus:border-wac-orange"
                    />
                  </td>
                  {(
                    [
                      'min',
                      'rUnder45',
                      'r45',
                      'r100',
                      'r500',
                      'r1000',
                      'fsc',
                      'ssc',
                    ] as const
                  ).map((key, colIdx, keys) => (
                    <td key={key} className="px-2 py-1.5">
                      <input
                        ref={(el) => {
                          cellRefs.current[`air-${i}-${key}`] = el
                        }}
                        type="text"
                        inputMode="decimal"
                        value={Number.isFinite(row[key]) ? String(row[key]) : ''}
                        onChange={(e) =>
                          patchAir(i, {
                            [key]: Number(e.target.value) || 0,
                          })
                        }
                        onKeyDown={(e) =>
                          handleNav(e, {
                            enter: `air-${i + 1 < master.air.length ? i + 1 : 0}-${key}`,
                            down: `air-${i + 1 < master.air.length ? i + 1 : 0}-${key}`,
                            up: `air-${i - 1 >= 0 ? i - 1 : master.air.length - 1}-${key}`,
                            left: colIdx === 0 ? `air-${i}-route` : `air-${i}-${keys[colIdx - 1]}`,
                            right: colIdx === keys.length - 1 ? `air-${i}-currency` : `air-${i}-${keys[colIdx + 1]}`,
                          })
                        }
                        className="h-8 w-full min-w-[52px] rounded border border-slate-200 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                      />
                    </td>
                  ))}
                  <td className="min-w-[78px] px-2 py-1.5">
                    <select
                      ref={(el) => {
                        cellRefs.current[`air-${i}-currency`] = el
                      }}
                      value={row.currency}
                      onChange={(e) =>
                        patchAir(i, {
                          currency: e.target.value as 'USD' | 'HKD',
                        })
                      }
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `air-${i + 1 < master.air.length ? i + 1 : 0}-currency`,
                          down: `air-${i + 1 < master.air.length ? i + 1 : 0}-currency`,
                          up: `air-${i - 1 >= 0 ? i - 1 : master.air.length - 1}-currency`,
                          left: `air-${i}-ssc`,
                        })
                      }
                      className="h-8 w-full rounded border border-slate-200 bg-white px-1 text-[11px] font-bold outline-none focus:border-wac-orange"
                    >
                      <option value="USD">USD</option>
                      <option value="HKD">HKD</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => onChange(removeAirRoute(master, i))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
                      aria-label="Remove route"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="px-4 pt-4 text-[10px] font-bold tracking-wider text-wac-navy uppercase">
            Local charges (Master_DB)
          </p>
          <button
            type="button"
            onClick={() => onChange(addLocalCharge(master))}
            className="mr-4 inline-flex items-center gap-1 text-[10px] font-bold text-wac-orange uppercase hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add line
          </button>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[520px] text-left text-[11px]">
            <thead>
              <tr className="bg-[#1A2A3A] text-[9px] font-bold uppercase tracking-wider text-white/80">
                <th className="px-2 py-2">Charge item</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2">Rate</th>
                <th className="px-2 py-2">MIN</th>
                <th className="w-8 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {master.local.map((row, i) => (
                <tr key={`${row.item}-${i}`} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/50">
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => {
                        cellRefs.current[`local-${i}-item`] = el
                      }}
                      type="text"
                      value={row.item}
                      onChange={(e) => patchLocal(i, { item: e.target.value })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-item`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-item`,
                          right: `local-${i}-unit`,
                        })
                      }
                      className="h-8 w-full min-w-[120px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-semibold outline-none focus:border-wac-orange"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => {
                        cellRefs.current[`local-${i}-unit`] = el
                      }}
                      type="text"
                      value={row.unit}
                      onChange={(e) => patchLocal(i, { unit: e.target.value })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-unit`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-unit`,
                          up: `local-${i - 1 >= 0 ? i - 1 : master.local.length - 1}-unit`,
                          left: `local-${i}-item`,
                          right: `local-${i}-rate`,
                        })
                      }
                      className="h-8 w-full min-w-[80px] rounded border border-slate-200 px-1.5 text-[11px] outline-none focus:border-wac-orange"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => {
                        cellRefs.current[`local-${i}-rate`] = el
                      }}
                      type="text"
                      inputMode="decimal"
                      value={Number.isFinite(row.rate) ? String(row.rate) : ''}
                      onChange={(e) => patchLocal(i, { rate: Number(e.target.value) || 0 })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-rate`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-rate`,
                          up: `local-${i - 1 >= 0 ? i - 1 : master.local.length - 1}-rate`,
                          left: `local-${i}-unit`,
                          right: `local-${i}-min`,
                        })
                      }
                      className="h-8 w-full min-w-[52px] rounded border border-slate-200 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={(el) => {
                        cellRefs.current[`local-${i}-min`] = el
                      }}
                      type="text"
                      inputMode="decimal"
                      value={Number.isFinite(row.min) ? String(row.min) : ''}
                      onChange={(e) => patchLocal(i, { min: Number(e.target.value) || 0 })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-min`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-min`,
                          up: `local-${i - 1 >= 0 ? i - 1 : master.local.length - 1}-min`,
                          left: `local-${i}-rate`,
                        })
                      }
                      className="h-8 w-full min-w-[52px] rounded border border-slate-200 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => onChange(removeLocalCharge(master, i))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
                      aria-label="Remove charge"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        Excel Master_DB ?몃?移멸낵 ?숈씪 ???ш린???섏젙?섎㈃ Desk 寃ъ쟻쨌李멸퀬(Master)??利됱떆
        諛섏쁺?⑸땲?? Import xlsx濡???뼱???섎룄 ?덉뒿?덈떎.
      </p>
    </div>
  )
}
