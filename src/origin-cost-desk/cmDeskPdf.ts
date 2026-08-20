import type { CmDeskLine } from './cmDeskQuote'

/** PDF/견적서에서 비어 있는 Other 줄은 제외 (Excel 빈 Other와 동일) */
export function isLineVisibleOnPdf(
  line: CmDeskLine,
  exceptionDraft: Record<string, string> = {},
): boolean {
  const draft = exceptionDraft[line.id]?.trim() ?? ''

  if (line.excluded) return false

  // Excel rule (as per user request):
  // - Other slots are hidden on PDF unless the user actually filled the 예외 (J column).
  //   (Even if Master reference exists and ref/amount are > 0, keep it hidden.)
  if (line.isOtherSlot) {
    if (draft === '') return false
    const n = Number(draft)
    return Number.isFinite(n) && n > 0
  }

  // Non-Other lines:
  // - show when there is a positive applied amount, or user filled an exception explicitly.
  if (line.amount > 0) return true
  if (draft !== '') {
    const n = Number(draft)
    if (Number.isFinite(n) && n > 0) return true
  }
  if (line.override != null && line.override > 0) return true
  return false
}

export function filterLinesForPdf(
  lines: CmDeskLine[],
  exceptionDraft: Record<string, string>,
): CmDeskLine[] {
  return lines.filter((l) => isLineVisibleOnPdf(l, exceptionDraft))
}
