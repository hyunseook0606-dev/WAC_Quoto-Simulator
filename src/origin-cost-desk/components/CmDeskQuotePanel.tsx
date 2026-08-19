import { Copy, FileSpreadsheet, Printer, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import type { CmDeskLine, CmDeskQuoteResult } from '../cmDeskQuote'
import type { CmMaster } from '../cmExcelMaster'
import type { CmExtraOther } from '../cmDeskConfig'
import { buildCmDeskPlainTable, buildCmDeskQuotationHtml } from '../cmDeskDocument'
import { printQuotation } from '../../quoteDocument'
import { isLineVisibleOnPdf } from '../cmDeskPdf'

type Props = {
  master: CmMaster | null
  quote: CmDeskQuoteResult | null
  origin: string
  destination: string
  exceptionDraft: Record<string, string>
  otherLabels: Record<string, string>
  otherUnits: Record<string, string>
  extraOthers: CmExtraOther[]
  onExceptionChange: (id: string, value: string) => void
  onOtherLabelChange: (id: string, value: string) => void
  onOtherUnitChange: (id: string, value: string) => void
  onAddExtraOther: () => void
  onRemoveExtraOther: (id: string) => void
  onExtraOtherChange: (id: string, patch: Partial<CmExtraOther>) => void
  onCopy: () => void
  onPrint: () => void
  copied: boolean
}

export function CmDeskQuotePanel({
  master,
  quote,
  origin,
  destination,
  exceptionDraft,
  otherLabels,
  otherUnits,
  extraOthers,
  onExceptionChange,
  onOtherLabelChange,
  onOtherUnitChange,
  onAddExtraOther,
  onRemoveExtraOther,
  onExtraOtherChange,
  onCopy,
  onPrint,
  copied,
}: Props) {
  if (!master) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-12">
        <FileSpreadsheet className="mb-4 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Master_DB loading?</p>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-bold text-amber-900">No Master rate for {origin}-{destination}</p>
        <p className="mt-2 text-sm text-amber-800">
          Add the route in Master_DB, then import xlsx or calculate again.
        </p>
      </div>
    )
  }

  const cur = quote.currency

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-bold tracking-wider text-wac-orange uppercase">
              Excel 입력 시트 TOTAL APPX.
            </p>
            <p className="font-display text-3xl font-black text-wac-navy">
              {cur} {quote.total.toFixed(2)}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {quote.route} · {quote.breakLabel} · C.W. {quote.cw.toFixed(2)} kg
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-wac-orange"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copied!' : 'Copy table'}
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-lg bg-wac-navy px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#243447]"
            >
              <Printer className="h-4 w-4" />
              Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-wac-navy uppercase">
              Charges 참고 / 예외 (Excel 입력)
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Other 1–12 + 추가 줄. PDF에는 예외가 있는 Other만 표시됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddExtraOther}
            className="inline-flex items-center gap-1 rounded-lg border border-wac-orange bg-white px-2.5 py-1.5 text-[10px] font-bold text-wac-orange uppercase hover:bg-orange-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Other 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="px-3 py-2.5">Charge</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">참고</th>
                <th className="px-3 py-2.5 text-right">예외</th>
                <th className="px-3 py-2.5 text-right">Applied</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((l: CmDeskLine) => {
                const onPdf = isLineVisibleOnPdf(l, exceptionDraft)
                const isDynamicExtra = extraOthers.some((e) => e.id === l.id)
                return (
                  <tr
                    key={l.id}
                    className={`border-t border-slate-50 ${!onPdf && l.isOtherSlot ? 'bg-slate-50/80 opacity-75' : ''}`}
                  >
                    <td className="px-3 py-2 align-top">
                      {l.editableLabel ? (
                        <input
                          type="text"
                          value={
                            isDynamicExtra
                              ? extraOthers.find((e) => e.id === l.id)?.label ?? l.label
                              : otherLabels[l.id] ?? l.label
                          }
                          onChange={(e) =>
                            isDynamicExtra
                              ? onExtraOtherChange(l.id, { label: e.target.value })
                              : onOtherLabelChange(l.id, e.target.value)
                          }
                          className="h-9 w-full min-w-[140px] rounded border border-slate-200 px-2 text-[12px] font-semibold text-wac-navy outline-none focus:border-wac-orange"
                        />
                      ) : (
                        <span className="font-semibold text-wac-navy">{l.label}</span>
                      )}
                      {l.note && (
                        <span className="mt-0.5 block text-[10px] text-slate-400">{l.note}</span>
                      )}
                      {l.isOtherSlot && !onPdf && (
                        <span className="mt-0.5 block text-[9px] text-slate-400">
                          PDF 숨김 (빈 예외)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {l.editableUnit ? (
                        <input
                          type="text"
                          value={
                            isDynamicExtra
                              ? extraOthers.find((e) => e.id === l.id)?.unit ?? l.unit
                              : otherUnits[l.id] ?? l.unit
                          }
                          onChange={(e) =>
                            isDynamicExtra
                              ? onExtraOtherChange(l.id, { unit: e.target.value })
                              : onOtherUnitChange(l.id, e.target.value)
                          }
                          className="h-9 w-24 rounded border border-slate-200 px-2 text-[11px] outline-none focus:border-wac-orange"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-500">{l.unit}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-500">
                      {l.ref.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="예외"
                        value={exceptionDraft[l.id] ?? ''}
                        onChange={(e) => onExceptionChange(l.id, e.target.value)}
                        className="h-9 w-28 rounded border border-yellow-200 bg-yellow-50 px-2 text-right text-[12px] font-medium outline-none focus:border-wac-orange"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">
                      {cur} {l.amount.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {isDynamicExtra && (
                        <button
                          type="button"
                          onClick={() => onRemoveExtraOther(l.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
                          aria-label="Remove other"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-wac-orange bg-orange-50">
                <td colSpan={4} className="px-3 py-3 text-right text-[11px] font-bold uppercase text-wac-orange">
                  Total appx.
                </td>
                <td colSpan={2} className="px-3 py-3 text-right text-lg font-black text-wac-navy">
                  {cur} {quote.total.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export function printCmDeskQuote(
  opts: Parameters<typeof buildCmDeskQuotationHtml>[0],
) {
  printQuotation(buildCmDeskQuotationHtml(opts))
}

export { buildCmDeskPlainTable }
