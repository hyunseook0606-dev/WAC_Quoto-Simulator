/** Excel 입력 Other 1–6 (Master-linked) + Other 7–12 (manual) + dynamic extras */
export const MASTER_OTHER_COUNT = 6
export const MANUAL_OTHER_COUNT = 6
export const TOTAL_OTHER_SLOTS = MASTER_OTHER_COUNT + MANUAL_OTHER_COUNT

export const DEFAULT_OTHER_LABELS: Record<string, string> = {
  other1: 'Other 1 (XRAY)',
  other2: 'Other 2 (CFS)',
  other3: 'Other 3 (Pickup)',
  other4: 'Other 4 (Export)',
  other5: 'Other 5 (RE-PACK)',
  other6: 'Other 6 (Gate/etc)',
  other7: 'Other 7',
  other8: 'Other 8',
  other9: 'Other 9',
  other10: 'Other 10',
  other11: 'Other 11',
  other12: 'Other 12',
}

export type CmExtraOther = {
  id: string
  label: string
  unit: string
}
