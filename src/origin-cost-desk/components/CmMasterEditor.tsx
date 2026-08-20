import { Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { CmAirRate, CmMaster } from '../cmExcelMaster'
import {
  addAirRoute,
  addLocalCharge,
  addWeightBreak,
  patchAirRoute,
  patchLocalRate,
  patchWeightBreak,
  removeAirRoute,
  removeLocalCharge,
  removeWeightBreak,
  resetGcrBreaks,
} from '../cmMasterEdit'

export function NumericCell({
  value,
  onCommit,
  onKeyDown,
  inputRef,
  className,
}: {
  value: number
  onCommit: (n: number) => void
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  inputRef?: (el: HTMLInputElement | null) => void
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')
  const shown = focused ? draft : Number.isFinite(value) ? String(value) : ''
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={shown}
      onFocus={() => {
        setFocused(true)
        setDraft(Number.isFinite(value) ? String(value) : '')
      }}
      onBlur={() => {
        setFocused(false)
        const n = Number(draft)
        onCommit(Number.isFinite(n) ? n : 0)
      }}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d.-]/g, ''))}
      onKeyDown={onKeyDown}
      className={className}
    />
  )
}

type Props = {
  master: CmMaster
  onChange: (next: CmMaster) => void
}

export function CmMasterEditor({ master, onChange }: Props) {
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})
  const [newBreakKg, setNewBreakKg] = useState('300')

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

  const rateCellId = (row: number, breakIdx: number) => `air-${row}-r${breakIdx}`

  const addBreakFromDraft = () => {
    const n = Number(newBreakKg)
    onChange(addWeightBreak(master, Number.isFinite(n) ? n : 300))
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-wac-navy uppercase">
              Air routes (Master_DB)
            </p>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Default GCR breaks are -45 / +45 / +100 / +500 / +1000. Add +300, +2000,
              or a single FLAT column for contract rates. Route codes are editable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(addAirRoute(master))}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-wac-orange uppercase hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add route
          </button>
        </div>

        <div className="mx-4 mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            New break (kg)
            <input
              type="text"
              inputMode="numeric"
              value={newBreakKg}
              onChange={(e) => setNewBreakKg(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addBreakFromDraft()
                }
              }}
              className="mt-1 block h-8 w-24 rounded border border-slate-200 bg-white px-2 text-[11px] font-bold outline-none focus:border-wac-orange"
            />
          </label>
          <button
            type="button"
            onClick={addBreakFromDraft}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-wac-navy px-3 text-[10px] font-bold text-white uppercase"
          >
            <Plus className="h-3 w-3" />
            Add column
          </button>
          <button
            type="button"
            onClick={() => onChange(addWeightBreak(master, 0))}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 uppercase"
          >
            Add FLAT
          </button>
          <button
            type="button"
            onClick={() => onChange(resetGcrBreaks(master))}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 uppercase"
          >
            Reset GCR
          </button>
        </div>

        <div className="mt-3 overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[820px] text-left text-[11px]">
            <thead>
              <tr className="bg-[#1A2A3A] text-[9px] font-bold uppercase tracking-wider text-white/80">
                <th className="px-2 py-2 align-bottom">Route</th>
                <th className="px-2 py-2 align-bottom">MIN</th>
                {master.breaks.map((br, bi) => (
                  <th key={br.id} className="min-w-[88px] px-2 py-2">
                    <input
                      type="text"
                      value={br.label}
                      onChange={(e) =>
                        onChange(patchWeightBreak(master, bi, { label: e.target.value }))
                      }
                      className="mb-1 h-6 w-full rounded border border-white/20 bg-white/10 px-1 text-center text-[10px] font-bold uppercase text-white outline-none focus:border-wac-orange"
                    />
                    <div className="flex items-center gap-1">
                      <NumericCell
                        value={br.minKg}
                        onCommit={(n) =>
                          onChange(patchWeightBreak(master, bi, { minKg: n }))
                        }
                        className="h-6 w-full rounded border border-white/20 bg-white/10 px-1 text-center text-[10px] text-white outline-none focus:border-wac-orange"
                      />
                      <button
                        type="button"
                        onClick={() => onChange(removeWeightBreak(master, bi))}
                        disabled={master.breaks.length <= 1}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/70 hover:text-red-300 disabled:opacity-30"
                        aria-label={`Remove ${br.label}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-center text-[8px] font-semibold normal-case tracking-normal text-white/50">
                      ≥ {br.minKg}kg
                    </p>
                  </th>
                ))}
                <th className="px-2 py-2 align-bottom">FSC</th>
                <th className="px-2 py-2 align-bottom">SSC</th>
                <th className="min-w-[78px] px-2 py-2 align-bottom">CUR</th>
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
                  <td className="px-2 py-1.5">
                    <NumericCell
                      inputRef={(el) => {
                        cellRefs.current[`air-${i}-min`] = el
                      }}
                      value={row.min}
                      onCommit={(n) => patchAir(i, { min: n })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `air-${i + 1 < master.air.length ? i + 1 : 0}-min`,
                          down: `air-${i + 1 < master.air.length ? i + 1 : 0}-min`,
                          up: `air-${i - 1 >= 0 ? i - 1 : master.air.length - 1}-min`,
                          left: `air-${i}-route`,
                          right: rateCellId(i, 0),
                        })
                      }
                      className="h-8 w-full min-w-[52px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                    />
                  </td>
                  {master.breaks.map((br, bi) => (
                    <td key={br.id} className="px-2 py-1.5">
                      <NumericCell
                        inputRef={(el) => {
                          cellRefs.current[rateCellId(i, bi)] = el
                        }}
                        value={row.rates[bi] ?? 0}
                        onCommit={(n) => {
                          const rates = [...row.rates]
                          rates[bi] = n
                          patchAir(i, { rates })
                        }}
                        onKeyDown={(e) =>
                          handleNav(e, {
                            enter: rateCellId(
                              i + 1 < master.air.length ? i + 1 : 0,
                              bi,
                            ),
                            down: rateCellId(
                              i + 1 < master.air.length ? i + 1 : 0,
                              bi,
                            ),
                            up: rateCellId(
                              i - 1 >= 0 ? i - 1 : master.air.length - 1,
                              bi,
                            ),
                            left:
                              bi === 0
                                ? `air-${i}-min`
                                : rateCellId(i, bi - 1),
                            right:
                              bi === master.breaks.length - 1
                                ? `air-${i}-fsc`
                                : rateCellId(i, bi + 1),
                          })
                        }
                        className="h-8 w-full min-w-[52px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <NumericCell
                      inputRef={(el) => {
                        cellRefs.current[`air-${i}-fsc`] = el
                      }}
                      value={row.fsc}
                      onCommit={(n) => patchAir(i, { fsc: n })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `air-${i + 1 < master.air.length ? i + 1 : 0}-fsc`,
                          down: `air-${i + 1 < master.air.length ? i + 1 : 0}-fsc`,
                          up: `air-${i - 1 >= 0 ? i - 1 : master.air.length - 1}-fsc`,
                          left: rateCellId(i, master.breaks.length - 1),
                          right: `air-${i}-ssc`,
                        })
                      }
                      className="h-8 w-full min-w-[52px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <NumericCell
                      inputRef={(el) => {
                        cellRefs.current[`air-${i}-ssc`] = el
                      }}
                      value={row.ssc}
                      onCommit={(n) => patchAir(i, { ssc: n })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `air-${i + 1 < master.air.length ? i + 1 : 0}-ssc`,
                          down: `air-${i + 1 < master.air.length ? i + 1 : 0}-ssc`,
                          up: `air-${i - 1 >= 0 ? i - 1 : master.air.length - 1}-ssc`,
                          left: `air-${i}-fsc`,
                          right: `air-${i}-currency`,
                        })
                      }
                      className="h-8 w-full min-w-[52px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                    />
                  </td>
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
                    <NumericCell
                      inputRef={(el) => {
                        cellRefs.current[`local-${i}-rate`] = el
                      }}
                      value={row.rate}
                      onCommit={(n) => patchLocal(i, { rate: n })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-rate`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-rate`,
                          up: `local-${i - 1 >= 0 ? i - 1 : master.local.length - 1}-rate`,
                          left: `local-${i}-unit`,
                          right: `local-${i}-min`,
                        })
                      }
                      className="h-8 w-full min-w-[52px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <NumericCell
                      inputRef={(el) => {
                        cellRefs.current[`local-${i}-min`] = el
                      }}
                      value={row.min}
                      onCommit={(n) => patchLocal(i, { min: n })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-min`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-min`,
                          up: `local-${i - 1 >= 0 ? i - 1 : master.local.length - 1}-min`,
                          left: `local-${i}-rate`,
                        })
                      }
                      className="h-8 w-full min-w-[52px] rounded border border-yellow-100 bg-yellow-50 px-1.5 text-[11px] font-medium outline-none focus:border-wac-orange"
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
        Break columns and routes stay in this browser until you Import xlsx or Reload
        Excel default. Highest matching kg wins (e.g. C.W. 220 uses +100, not +45).
        Flat rate: keep one FLAT column at 0kg and remove the others.
      </p>
    </div>
  )
}
