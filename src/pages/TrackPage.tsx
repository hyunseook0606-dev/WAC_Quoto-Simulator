import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Check,
  Copy,
  Download,
  FileText,
  PackageSearch,
} from 'lucide-react'
import { SiteFooter, SiteHeader } from '../chrome'

type MilestoneStatus = 'done' | 'current' | 'pending'
type TimeKind = 'ACT' | 'EST'

type Milestone = {
  id: string
  label: string
  location: string
  time: string
  kind: TimeKind
  status: MilestoneStatus
}

type EventRow = {
  at: string
  location: string
  code: string
  description: string
}

type TrackResult = {
  ok: boolean
  awb: string
  carrier: string
  carrierCode: string
  prefix: string
  flight: string
  origin: string
  destination: string
  pieces: number
  grossKg: number
  cwKg: number
  status: 'In Transit' | 'Arrived' | 'Delivered'
  etd: string
  eta: string
  milestones: Milestone[]
  events: EventRow[]
}

const CARRIERS: Record<
  string,
  { name: string; code: string; flight: string; origin: string; dest: string }
> = {
  '160': {
    name: 'Cathay Pacific',
    code: 'CX',
    flight: 'CX412',
    origin: 'ICN',
    dest: 'LAX',
  },
  '180': {
    name: 'Korean Air',
    code: 'KE',
    flight: 'KE017',
    origin: 'ICN',
    dest: 'LAX',
  },
  '988': {
    name: 'Asiana Airlines',
    code: 'OZ',
    flight: 'OZ202',
    origin: 'ICN',
    dest: 'LAX',
  },
}

function mockTrack(raw: string): TrackResult | { ok: false } {
  const awb = raw.replace(/\s+/g, '').toUpperCase()
  const digits = awb.replace(/[^0-9]/g, '')
  if (digits.length < 8) return { ok: false }

  const prefix = digits.slice(0, 3)
  const meta = CARRIERS[prefix] ?? {
    name: 'WAC Partner Carrier',
    code: 'WAC',
    flight: 'WAC101',
    origin: 'HKG',
    dest: 'ICN',
  }

  const variant = Number(digits.slice(-1)) % 3
  const status: TrackResult['status'] =
    variant === 0 ? 'Delivered' : variant === 1 ? 'Arrived' : 'In Transit'

  const doneUntil =
    status === 'Delivered' ? 7 : status === 'Arrived' ? 5 : 4

  const base: Omit<Milestone, 'status'>[] = [
    {
      id: 'bkd',
      label: 'Booking Confirmed',
      location: `${meta.origin} Export Desk`,
      time: '16 Aug 2026 · 09:14',
      kind: 'ACT',
    },
    {
      id: 'rcs',
      label: 'Received at Warehouse',
      location: `${meta.origin} Cargo Terminal`,
      time: '16 Aug 2026 · 14:32',
      kind: 'ACT',
    },
    {
      id: 'crc',
      label: 'Export Customs Cleared',
      location: `${meta.origin} Customs`,
      time: '16 Aug 2026 · 18:05',
      kind: 'ACT',
    },
    {
      id: 'dep',
      label: 'Departed Origin',
      location: `${meta.origin} · ${meta.flight}`,
      time: '17 Aug 2026 · 01:40',
      kind: 'ACT',
    },
    {
      id: 'arr',
      label: 'Arrived Destination',
      location: `${meta.dest} Import Terminal`,
      time:
        doneUntil >= 5 ? '17 Aug 2026 · 18:22' : '17 Aug 2026 · 19:10',
      kind: doneUntil >= 5 ? 'ACT' : 'EST',
    },
    {
      id: 'imp',
      label: 'Import Customs',
      location: `${meta.dest} Customs`,
      time:
        doneUntil >= 6 ? '18 Aug 2026 · 08:15' : '18 Aug 2026 · 10:00',
      kind: doneUntil >= 6 ? 'ACT' : 'EST',
    },
    {
      id: 'dlv',
      label: status === 'Delivered' ? 'Delivered' : 'Out for Delivery',
      location: `${meta.dest} Consignee`,
      time:
        doneUntil >= 7 ? '18 Aug 2026 · 15:48' : '18 Aug 2026 · 16:30',
      kind: doneUntil >= 7 ? 'ACT' : 'EST',
    },
  ]

  const milestones: Milestone[] = base.map((m, i) => {
    if (status === 'Delivered') return { ...m, status: 'done' as const }
    if (i < doneUntil - 1) return { ...m, status: 'done' as const }
    if (i === doneUntil - 1) return { ...m, status: 'current' as const }
    return { ...m, status: 'pending' as const }
  })

  const events: EventRow[] = [
    {
      at: '16 Aug 2026 09:14',
      location: meta.origin,
      code: 'BKD',
      description: 'Booking confirmed — space allocated on Master',
    },
    {
      at: '16 Aug 2026 14:32',
      location: meta.origin,
      code: 'RCS',
      description: 'Received from shipper at origin warehouse (5 PCS)',
    },
    {
      at: '16 Aug 2026 16:10',
      location: meta.origin,
      code: 'MAN',
      description: 'Manifested on flight ' + meta.flight,
    },
    {
      at: '16 Aug 2026 18:05',
      location: meta.origin,
      code: 'CRC',
      description: 'Export customs clearance completed',
    },
    {
      at: '17 Aug 2026 01:40',
      location: meta.origin,
      code: 'DEP',
      description: `Departed ${meta.origin} on ${meta.flight}`,
    },
  ]

  if (doneUntil >= 5) {
    events.push({
      at: '17 Aug 2026 18:22',
      location: meta.dest,
      code: 'ARR',
      description: `Arrived ${meta.dest} — freight standing by`,
    })
  }
  if (doneUntil >= 6) {
    events.push({
      at: '18 Aug 2026 08:15',
      location: meta.dest,
      code: 'CCD',
      description: 'Import customs cleared',
    })
  }
  if (doneUntil >= 7) {
    events.push({
      at: '18 Aug 2026 15:48',
      location: meta.dest,
      code: 'DLV',
      description: 'Delivered to consignee — POD captured',
    })
  }

  return {
    ok: true,
    awb: `${prefix}-${digits.slice(3)}`,
    carrier: meta.name,
    carrierCode: meta.code,
    prefix,
    flight: meta.flight,
    origin: meta.origin,
    destination: meta.dest,
    pieces: 5,
    grossKg: 450,
    cwKg: 512.4,
    status,
    etd: '17 Aug 2026 01:40',
    eta: '17 Aug 2026 19:10',
    milestones,
    events: events.reverse(),
  }
}

function statusClass(status: TrackResult['status']) {
  if (status === 'Delivered') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (status === 'Arrived') return 'bg-sky-50 text-sky-800 border-sky-200'
  return 'bg-blue-50 text-blue-800 border-blue-200'
}

function downloadDummy(name: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function TrackPage() {
  const [searchParams] = useSearchParams()
  const initialAwb = searchParams.get('awb')?.trim() || '160-12345675'
  const [awb, setAwb] = useState(initialAwb)
  const [query, setQuery] = useState(initialAwb)
  const [copied, setCopied] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  const result = useMemo(() => mockTrack(query), [query])

  useEffect(() => {
    const next = searchParams.get('awb')?.trim()
    if (!next) return
    setAwb(next)
    setQuery(next)
  }, [searchParams])

  useEffect(() => {
    setLogoFailed(false)
  }, [query])

  const copyAwb = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F5F8] font-sans text-wac-navy">
      <SiteHeader />
      <main className="mx-auto max-w-[1120px] px-6 pt-28 pb-20">
        <p className="text-[11px] font-bold tracking-[0.22em] text-wac-orange uppercase">
          Shipment visibility
        </p>
        <h1 className="font-display mt-2 text-3xl font-extrabold sm:text-4xl">
          Track air freight
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-slate-500">
          AWB milestone view for WAC Desk — demo data for presentation, not a
          live airline feed.
        </p>

        <form
          className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(awb)
          }}
        >
          <PackageSearch className="ml-2 hidden h-5 w-5 text-slate-400 sm:block" />
          <input
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            placeholder="Air waybill — e.g. 160-12345675"
            className="h-12 flex-1 px-3 text-[15px] font-semibold outline-none"
          />
          <button
            type="submit"
            className="h-12 rounded-lg bg-wac-navy px-6 text-[13px] font-extrabold text-white hover:bg-[#24384c]"
          >
            Track shipment
          </button>
        </form>
        <p className="mt-2 text-[11px] text-slate-400">
          Try 160-12345675 (In Transit) · 160-12345674 (Arrived) · 160-12345673
          (Delivered)
        </p>

        {'ok' in result && result.ok === false && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Enter a valid AWB (8+ digits).
          </p>
        )}

        {result.ok && (
          <div className="mt-8 space-y-5">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-1">
                    {logoFailed ? (
                      <span className="text-[11px] font-extrabold tracking-wide">
                        {result.carrierCode}
                      </span>
                    ) : (
                      <img
                        src={`https://pics.avs.io/120/80/${result.carrierCode}.png`}
                        alt={result.carrier}
                        className="h-full w-full object-contain"
                        onError={() => setLogoFailed(true)}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      {result.carrier} · AWB {result.prefix}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="font-display text-xl font-extrabold tracking-wide">
                        {result.awb}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyAwb(result.awb)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-wac-orange hover:text-wac-orange"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-wide uppercase ${statusClass(result.status)}`}
                >
                  {result.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Route
                  </p>
                  <p className="mt-0.5 text-[14px] font-extrabold tracking-wide">
                    {result.origin}
                    <span className="mx-1.5 font-semibold text-slate-300">→</span>
                    {result.destination}
                  </p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Flight
                  </p>
                  <p className="mt-0.5 text-[14px] font-extrabold">{result.flight}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Pieces / Gross wt
                  </p>
                  <p className="mt-0.5 text-[14px] font-extrabold">
                    {result.pieces} PCS / {result.grossKg.toFixed(1)} KG
                  </p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Chargeable wt
                  </p>
                  <p className="mt-0.5 text-[14px] font-extrabold">
                    {result.cwKg.toFixed(1)} KG
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-500">
                <span>
                  ETD <b className="text-wac-navy">{result.etd}</b>
                </span>
                <span>
                  ETA <b className="text-wac-navy">{result.eta}</b>
                </span>
                <span className="text-slate-400">
                  Demo Master — not live CargoSpot / airline API
                </span>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-extrabold tracking-wide uppercase">
                  Milestones
                </h2>
                <p className="text-[10px] font-bold text-slate-400">
                  <span className="mr-2 text-emerald-700">ACT actual</span>
                  <span className="text-slate-500">EST estimated</span>
                </p>
              </div>
              <ol className="grid gap-0 sm:grid-cols-7">
                {result.milestones.map((m, i) => (
                  <li key={m.id} className="relative flex sm:flex-col">
                    {i < result.milestones.length - 1 && (
                      <span
                        className={`absolute top-3 left-3 hidden h-0.5 w-full sm:block ${
                          m.status === 'done' ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-10 mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 sm:mx-auto sm:mr-0 ${
                        m.status === 'done'
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : m.status === 'current'
                            ? 'track-pulse border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white text-slate-300'
                      }`}
                    >
                      {m.status === 'done' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            m.status === 'current' ? 'bg-white' : 'bg-slate-300'
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-5 sm:mt-3 sm:px-1 sm:pb-0 sm:text-center">
                      <p
                        className={`text-[11px] leading-snug font-bold ${
                          m.status === 'pending' ? 'text-slate-400' : ''
                        }`}
                      >
                        {m.label}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {m.location}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-600">
                        {m.time}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                          m.status === 'pending'
                            ? 'bg-slate-100 text-slate-500'
                            : m.kind === 'ACT'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {m.status === 'pending' ? 'EST · Pending' : m.kind}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-[13px] font-extrabold tracking-wide uppercase">
                  Event history
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="bg-slate-50 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Date / time</th>
                      <th className="px-4 py-2.5">Location</th>
                      <th className="px-4 py-2.5">Code</th>
                      <th className="px-4 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.events.map((e) => (
                      <tr key={`${e.at}-${e.code}`} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 whitespace-nowrap font-semibold">
                          {e.at}
                        </td>
                        <td className="px-4 py-2.5 font-bold">{e.location}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-wac-navy px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            {e.code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {e.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-[13px] font-extrabold tracking-wide uppercase">
                Documents
              </h2>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['House AWB', 'HAWB'],
                    ['Master AWB', 'MAWB'],
                    ['Commercial Invoice', 'CINV'],
                    ['Packing List', 'PL'],
                  ] as const
                ).map(([label, code]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() =>
                      downloadDummy(
                        `${code}_${result.awb.replace('-', '')}.txt`,
                        `WAC Logistics — ${label}\nAWB ${result.awb}\n${result.origin}-${result.destination}\n${result.flight}\nDemo document for internship presentation.\n`,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-bold text-slate-700 hover:border-wac-orange hover:text-wac-orange"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {label}
                    <Download className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        <p className="mt-8 text-[13px] text-slate-500">
          Need an indicative rate?{' '}
          <Link to="/quote" className="font-bold text-wac-orange hover:underline">
            Open Instant Quote
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
