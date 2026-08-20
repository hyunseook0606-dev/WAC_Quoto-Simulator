/** Shared quote history API client (falls back when server is offline). */

export type SharedHistoryItem = {
  id: string
  createdAt: string
  consignee: string
  origin: string
  destination: string
  cargoPieces: unknown[]
  blCount: number
  fxDraft: string
  carrierCode: string
  deskRemark: string
  exceptionDraft: Record<string, string>
  otherLabels: Record<string, string>
  otherUnits: Record<string, string>
  extraOthers: unknown[]
  disabledFixedOtherIds: string[]
  refDraft?: Record<string, string>
  currency: 'USD' | 'HKD'
  total: number
  cw: number
  cbm: number
  breakLabel: string
  savedPdfHtml?: string
  pinned?: boolean
  caseName?: string
}

export type HistorySource = 'server' | 'local'

function apiBase(): string {
  // Same origin in production (deskServer). In Vite dev, proxy /api → 8080.
  return ''
}

export async function fetchSharedHistory(): Promise<{
  ok: boolean
  source: HistorySource
  items: SharedHistoryItem[]
  updatedAt?: string | null
}> {
  try {
    const res = await fetch(`${apiBase()}/api/history`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { items?: SharedHistoryItem[]; updatedAt?: string }
    return {
      ok: true,
      source: 'server',
      items: Array.isArray(data.items) ? data.items : [],
      updatedAt: data.updatedAt ?? null,
    }
  } catch {
    return { ok: false, source: 'local', items: [] }
  }
}

export async function upsertSharedHistoryItem(
  item: SharedHistoryItem,
): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(item),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteSharedHistoryItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/history/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function probeSharedHistory(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/health`, { cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json()) as { sharedHistory?: boolean }
    return Boolean(data.sharedHistory)
  } catch {
    return false
  }
}
