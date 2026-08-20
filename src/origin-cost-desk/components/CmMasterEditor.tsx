import { Plus, Trash2 } from 'lucide-react'
import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { CmAirRate, CmMaster } from '../cmExcelMaster'
import { breakThresholdHint } from '../cmExcelMaster'
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
} from '../cmMasterEdit'
import { DraftTextInput } from './DraftTextInput'
import { handleArrowNav } from '../deskInputUx'

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
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const draftRef = useRef('')
  const selectAllOnMouseUp = useRef(false)
  const shown = editing
    ? draft
    : Number.isFinite(value)
      ? String(value)
      : ''

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={shown}
      onFocus={(event) => {
        const initial = Number.isFinite(value) ? String(value) : ''
        draftRef.current = initial
        setDraft(initial)
        setEditing(true)
        selectAllOnMouseUp.current = true
        event.currentTarget.select()
      }}
      onMouseUp={(event) => {
        if (selectAllOnMouseUp.current) {
          event.preventDefault()
          event.currentTarget.select()
          selectAllOnMouseUp.current = false
        }
      }}
      onBlur={() => {
        setEditing(false)
        selectAllOnMouseUp.current = false
        const raw = draftRef.current.trim()
        // Empty / invalid → keep previous (do not commit Number('') === 0)
        if (raw === '') return
        const n = Number(raw)
        if (Number.isFinite(n)) onCommit(n)
      }}
      onChange={(e) => {
        draftRef.current = e.target.value
        setDraft(e.target.value)
      }}
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
  const [breakNotice, setBreakNotice] = useState('')

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
    handleArrowNav(event, nav, focusCell)
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
    const kg = Number.isFinite(n) ? Math.max(0, n) : 300
    const next = addWeightBreak(master, kg)
    if (!next) {
      setBreakNotice(`Already have a column at ${kg} kg`)
      return
    }
    setBreakNotice('')
    onChange(next)
  }

  const editableInput = 'desk-master-input is-editable'
  const plainInput = 'desk-master-input'

  return (
    <div className="space-y-4">
      <div className="desk-panel">
        <div className="desk-panel-head">
          <span>Air routes</span>
          <button
            type="button"
            onClick={() => onChange(addAirRoute(master))}
            className="desk-btn gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add route
          </button>
        </div>

        <div className="desk-master-toolbar">
          <label className="text-slate-600">
            <span className="mr-1 font-semibold">Break from (kg)</span>
            <input
              type="text"
              value={newBreakKg}
              onChange={(e) => setNewBreakKg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addBreakFromDraft()
                }
              }}
              placeholder="300"
              className="desk-master-input ml-1 inline-block w-20"
            />
          </label>
          <button type="button" onClick={addBreakFromDraft} className="desk-btn desk-btn-primary gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add break
          </button>
          {breakNotice ? (
            <p className="text-[11px] font-semibold text-amber-700">{breakNotice}</p>
          ) : null}
          <p className="ml-auto text-[11px] text-slate-400">
            Amber cells are editable · saved on this PC
          </p>
        </div>

        <div className="desk-master-wrap">
          <table className="desk-master-table">
            <thead>
              <tr>
                <th className="col-route" rowSpan={2}>Route</th>
                <th rowSpan={2}>MIN</th>
                {master.breaks.map((br) => (
                  <th key={br.id} className="min-w-[72px] text-center">
                    {br.label}
                  </th>
                ))}
                <th rowSpan={2}>FSC</th>
                <th rowSpan={2}>SSC</th>
                <th rowSpan={2}>CUR</th>
                <th rowSpan={2} className="w-8" />
              </tr>
              <tr>
                {master.breaks.map((br, bi) => (
                  <th key={`${br.id}-kg`} className="min-w-[72px]">
                    <div className="flex items-center gap-0.5">
                      <NumericCell
                        value={br.minKg}
                        onCommit={(n) =>
                          onChange(patchWeightBreak(master, bi, { minKg: n }))
                        }
                        className={`${editableInput} text-center`}
                      />
                      <button
                        type="button"
                        onClick={() => onChange(removeWeightBreak(master, bi))}
                        disabled={master.breaks.length <= 1}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-slate-400 hover:text-red-500 disabled:opacity-30"
                        aria-label={`Remove ${br.label}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-center text-[9px] font-normal text-slate-500">
                      {breakThresholdHint(br, master.breaks)}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {master.air.map((row, i) => (
                <tr key={`${row.route}-${i}`}>
                  <td className="col-route">
                    <DraftTextInput
                      inputRef={(el) => {
                        cellRefs.current[`air-${i}-route`] = el
                      }}
                      value={row.route}
                      normalize={(v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '')}
                      onCommit={(route) => patchAir(i, { route })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `air-${i + 1 < master.air.length ? i + 1 : 0}-route`,
                          down: `air-${i + 1 < master.air.length ? i + 1 : 0}-route`,
                          right: `air-${i}-min`,
                        })
                      }
                      className={`${editableInput} font-bold uppercase`}
                    />
                  </td>
                  <td>
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
                      className={`${editableInput} text-right`}
                    />
                  </td>
                  {master.breaks.map((br, bi) => (
                    <td key={br.id}>
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
                        className={`${editableInput} text-right`}
                      />
                    </td>
                  ))}
                  <td>
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
                      className={`${editableInput} text-right`}
                    />
                  </td>
                  <td>
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
                      className={`${editableInput} text-right`}
                    />
                  </td>
                  <td>
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
                      className={`${plainInput} font-semibold`}
                    >
                      <option value="USD">USD</option>
                      <option value="HKD">HKD</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onChange(removeAirRoute(master, i))}
                      className="inline-flex h-7 w-7 items-center justify-center border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
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

      <div className="desk-panel">
        <div className="desk-panel-head">
          <span>Local charges</span>
          <button
            type="button"
            onClick={() => onChange(addLocalCharge(master))}
            className="desk-btn gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </button>
        </div>
        <div className="desk-master-wrap">
          <table className="desk-master-table min-w-[520px]">
            <thead>
              <tr>
                <th>Charge item</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>MIN</th>
                <th>Note</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {master.local.map((row, i) => (
                <tr key={`local-row-${i}`}>
                  <td>
                    <DraftTextInput
                      inputRef={(el) => {
                        cellRefs.current[`local-${i}-item`] = el
                      }}
                      value={row.item}
                      onCommit={(next) =>
                        patchLocal(i, { item: next.trim() || row.item })
                      }
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-item`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-item`,
                          right: `local-${i}-unit`,
                        })
                      }
                      className={`${editableInput} font-semibold`}
                    />
                  </td>
                  <td>
                    <DraftTextInput
                      inputRef={(el) => {
                        cellRefs.current[`local-${i}-unit`] = el
                      }}
                      value={row.unit}
                      onCommit={(next) => patchLocal(i, { unit: next })}
                      onKeyDown={(e) =>
                        handleNav(e, {
                          enter: `local-${i + 1 < master.local.length ? i + 1 : 0}-unit`,
                          down: `local-${i + 1 < master.local.length ? i + 1 : 0}-unit`,
                          up: `local-${i - 1 >= 0 ? i - 1 : master.local.length - 1}-unit`,
                          left: `local-${i}-item`,
                          right: `local-${i}-rate`,
                        })
                      }
                      className={plainInput}
                    />
                  </td>
                  <td>
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
                      className={`${editableInput} text-right`}
                    />
                  </td>
                  <td>
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
                      className={`${editableInput} text-right`}
                    />
                  </td>
                  <td>
                    <DraftTextInput
                      value={row.note ?? ''}
                      placeholder="C.W. kg / G.W. kg"
                      onCommit={(next) =>
                        patchLocal(i, {
                          note: next.trim() || undefined,
                        })
                      }
                      className={`${plainInput} min-w-[88px] text-[11px] text-slate-500`}
                      title="Per KG basis note (same as Master Note column)"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onChange(removeLocalCharge(master, i))}
                      className="inline-flex h-7 w-7 items-center justify-center border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
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
    </div>
  )
}
