import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Box,
  ChevronDown,
  Copy,
  Loader2,
  Mail,
  Phone,
  Plane,
  CheckCircle2,
} from 'lucide-react'

export type CargoInput = {
  length: number
  width: number
  height: number
  weight: number
}

export type CarrierQuote = {
  code: string
  prefix: string
  name: string
  hub: string
  schedule: string
  ratePerKg: number
  total: number
  color: string
  logoSrc?: string
}

const PRESETS = [
  {
    id: 'doc',
    label: 'Documents',
    sub: 'Small envelope',
    length: 35,
    width: 25,
    height: 5,
    weight: 1,
  },
  {
    id: 'small',
    label: 'Small box',
    sub: '30×20×15 cm',
    length: 30,
    width: 20,
    height: 15,
    weight: 3,
  },
  {
    id: 'medium',
    label: 'Medium',
    sub: '50×40×30 cm',
    length: 50,
    width: 40,
    height: 30,
    weight: 12,
  },
  {
    id: 'pallet',
    label: '1 PLT',
    sub: '120×100×60 cm',
    length: 120,
    width: 100,
    height: 60,
    weight: 83.6,
  },
] as const

const POPULAR_LANES = [
  ['HKG', 'ICN'],
  ['SIN', 'HKG'],
  ['ICN', 'HKG'],
  ['HKG', 'SIN'],
] as const

function CarrierLogo({
  code,
  name,
  color,
  logoSrc,
}: {
  code: string
  name: string
  color: string
  logoSrc?: string
}) {
  const remote = `https://pics.avs.io/120/80/${code}.png`
  const [src, setSrc] = useState(logoSrc || remote)
  const [failed, setFailed] = useState(false)

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white p-1 shadow-sm">
      {!failed ? (
        <img
          src={src}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          onError={() => {
            if (!logoSrc && src === remote) {
              setFailed(true)
              return
            }
            if (logoSrc && src !== logoSrc) {
              setSrc(logoSrc)
              return
            }
            setFailed(true)
          }}
        />
      ) : (
        <span
          className="font-display flex h-full w-full items-center justify-center rounded text-[11px] font-black text-white"
          style={{ background: color }}
        >
          {code}
        </span>
      )}
    </div>
  )
}

export type PublicQuoteDHLProps = {
  origin: string
  destination: string
  setOrigin: (v: string) => void
  setDestination: (v: string) => void
  cargo: CargoInput
  updateCargo: (key: keyof CargoInput, value: string) => void
  setCargo: (cargo: CargoInput) => void
  cw: number
  volWeight: number
  showResult: boolean
  isLoading: boolean
  formError: string
  handleCalculate: () => void
  quotes: CarrierQuote[]
  bestPublic: CarrierQuote | undefined
  quoteValidUntil: string
  copied: string
  handleRequestQuote: (carrier: CarrierQuote) => void
  handleCopyEmailDraft: (carrier: CarrierQuote) => void
  openDesk: () => void
  setDeskCarrier: (code: string) => void
  cmQuote: { total: number; route: string; breakLabel: string; cw: number } | null
}

export function PublicQuoteDHL({
  origin,
  destination,
  setOrigin,
  setDestination,
  cargo,
  updateCargo,
  setCargo,
  cw,
  volWeight,
  showResult,
  isLoading,
  formError,
  handleCalculate,
  quotes,
  bestPublic,
  quoteValidUntil,
  copied,
  handleRequestQuote,
  handleCopyEmailDraft,
  openDesk,
  setDeskCarrier,
  cmQuote,
}: PublicQuoteDHLProps) {
  const [dimMode, setDimMode] = useState<'custom' | 'preset'>('custom')
  const [shipmentType, setShipmentType] = useState<'package' | 'document'>(
    'package',
  )
  const [showAllCarriers, setShowAllCarriers] = useState(false)

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setCargo({
      length: p.length,
      width: p.width,
      height: p.height,
      weight: p.weight,
    })
    setDimMode('preset')
  }

  const displayTotal = bestPublic?.total ?? cmQuote?.total
  const displayCurrency = 'USD'

  return (
    <div className="space-y-6">
      {/* DHL-style main card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(26,42,58,0.22)]"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#FFCC00]/15 via-white to-wac-orange/5 px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] text-wac-navy/60 uppercase">
                Ship with WAC
              </p>
              <h3 className="font-display text-xl font-extrabold text-wac-navy sm:text-2xl">
                Get an instant air quote
              </h3>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setShipmentType('package')}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                  shipmentType === 'package'
                    ? 'bg-wac-navy text-white'
                    : 'text-slate-500 hover:text-wac-navy'
                }`}
              >
                Packages
              </button>
              <button
                type="button"
                onClick={() => {
                  setShipmentType('document')
                  applyPreset(PRESETS[0])
                }}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                  shipmentType === 'document'
                    ? 'bg-wac-navy text-white'
                    : 'text-slate-500 hover:text-wac-navy'
                }`}
              >
                Documents
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-5">
          {/* Input panel */}
          <div className="border-b border-slate-100 p-6 sm:p-8 lg:col-span-2 lg:border-r lg:border-b-0">
            <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setDimMode('custom')}
                className={`flex-1 rounded-md py-2 text-[11px] font-bold transition ${
                  dimMode === 'custom'
                    ? 'bg-white text-wac-navy shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Custom dimensions
              </button>
              <button
                type="button"
                onClick={() => setDimMode('preset')}
                className={`flex-1 rounded-md py-2 text-[11px] font-bold transition ${
                  dimMode === 'preset'
                    ? 'bg-white text-wac-navy shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Common sizes
              </button>
            </div>

            {dimMode === 'preset' && (
              <div className="mb-5 space-y-2">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Common sizes are typical air-cargo packages — tap one to fill
                  L×W×H and a sample weight. You can still edit the numbers
                  after. Chargeable weight uses MAX(gross, volumetric).
                </p>
                <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition hover:border-wac-orange/40 hover:bg-orange-50/50 ${
                      cargo.length === p.length &&
                      cargo.width === p.width &&
                      cargo.height === p.height
                        ? 'border-wac-orange bg-orange-50/70'
                        : 'border-slate-200 bg-slate-50/80'
                    }`}
                  >
                    <p className="text-[12px] font-bold text-wac-navy">
                      {p.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{p.sub}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {p.weight} kg sample
                    </p>
                  </button>
                ))}
                </div>
              </div>
            )}

            <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  From
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  placeholder="HKG"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-center text-sm font-bold uppercase tracking-widest text-wac-navy outline-none transition focus:border-wac-orange"
                />
              </div>
              <Plane className="mb-3 h-5 w-5 text-wac-orange" />
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  To
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.toUpperCase())}
                  placeholder="ICN"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-center text-sm font-bold uppercase tracking-widest text-wac-navy outline-none transition focus:border-wac-orange"
                />
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {POPULAR_LANES.map(([o, d]) => (
                <button
                  key={`${o}-${d}`}
                  type="button"
                  onClick={() => {
                    setOrigin(o)
                    setDestination(d)
                  }}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:border-wac-orange hover:text-wac-orange"
                >
                  {o}→{d}
                </button>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {(
                [
                  ['length', 'L cm'],
                  ['width', 'W cm'],
                  ['height', 'H cm'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={cargo[key]}
                    onChange={(e) => updateCargo(key, e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 px-2 text-center text-sm font-semibold outline-none focus:border-wac-orange focus:ring-1 focus:ring-wac-orange"
                  />
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
                Weight (kg)
              </label>
              <input
                type="number"
                value={cargo.weight}
                onChange={(e) => updateCargo('weight', e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-wac-orange focus:ring-1 focus:ring-wac-orange"
              />
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
              <span className="font-bold text-emerald-700">
                C.W. {cw > 0 ? `${cw.toFixed(1)} kg` : '—'}
              </span>
              <span className="mx-2 text-slate-300">|</span>
              Vol {volWeight > 0 ? `${volWeight.toFixed(1)} kg` : '—'}
              <span className="mx-2 text-slate-300">|</span>
              MAX(Gross, Vol÷6000)
            </div>

            {formError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                {formError}
              </p>
            )}

            <button
              type="button"
              onClick={handleCalculate}
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FFCC00] text-sm font-extrabold text-wac-navy shadow-md transition hover:bg-[#f0c000] disabled:cursor-wait disabled:opacity-80"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching rates…
                </>
              ) : (
                <>
                  Get a Quote
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Results panel — DHL two-card layout */}
          <div className="bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8 lg:col-span-3">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[360px] flex-col items-center justify-center"
                >
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-wac-orange" />
                  <p className="font-display text-lg font-bold text-wac-navy">
                    Searching carrier rates…
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {origin} → {destination} · {cw.toFixed(1)} kg C.W.
                  </p>
                </motion.div>
              ) : !showResult ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[360px] flex-col items-center justify-center text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Box className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="font-display text-lg font-bold text-wac-navy">
                    Your quote will appear here
                  </p>
                  <p className="mt-2 max-w-xs text-sm text-slate-500">
                    Enter lane and dimensions, then tap Get a Quote to compare
                    indicative air options.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      {origin} → {destination} · C.W. {cw.toFixed(1)} kg · valid{' '}
                      {quoteValidUntil}
                    </p>
                    {cmQuote && (
                      <span className="rounded-full bg-wac-navy/8 px-2.5 py-1 text-[10px] font-bold text-wac-navy">
                        Excel ref USD {cmQuote.total.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Primary — Request quote (DHL "Book online") */}
                    <motion.div
                      layout
                      className="relative overflow-hidden rounded-2xl border-2 border-wac-orange bg-white p-5 shadow-lg shadow-wac-orange/10"
                    >
                      <span className="absolute top-0 right-0 rounded-bl-lg bg-wac-orange px-2.5 py-1 text-[9px] font-bold text-white uppercase">
                        Recommended
                      </span>
                      {bestPublic && (
                        <div className="mb-3 flex items-center gap-3">
                          <CarrierLogo
                            code={bestPublic.code}
                            name={bestPublic.name}
                            color={bestPublic.color}
                            logoSrc={bestPublic.logoSrc}
                          />
                          <div>
                            <p className="font-bold text-wac-navy">
                              {bestPublic.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {bestPublic.hub} · AWB {bestPublic.prefix}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Indicative air total
                      </p>
                      <p className="font-display mt-1 text-4xl font-black text-wac-navy">
                        {displayCurrency}{' '}
                        {displayTotal != null ? displayTotal.toFixed(2) : '—'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Excludes origin cartage, customs &amp; final booking
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          bestPublic && handleRequestQuote(bestPublic)
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-wac-orange py-3 text-[13px] font-bold text-white transition hover:bg-[#d9441c]"
                      >
                        <Mail className="h-4 w-4" />
                        Request formal quote
                      </button>
                    </motion.div>

                    {/* Secondary — Call / Desk (DHL "Call" card) */}
                    <motion.div
                      layout
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Need full origin cost?
                      </p>
                      <p className="font-display mt-2 text-2xl font-extrabold text-wac-navy">
                        WAC Desk
                      </p>
                      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                        Cartage, tunnel, parking &amp; local master — same logic
                        as the Excel simulator.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (bestPublic) setDeskCarrier(bestPublic.code)
                          openDesk()
                        }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-wac-navy py-3 text-[13px] font-bold text-wac-navy transition hover:bg-wac-navy hover:text-white"
                      >
                        <Phone className="h-4 w-4" />
                        Open origin cost desk
                      </button>
                      <a
                        href="mailto:service@waclogistics.com"
                        className="mt-2 block text-center text-[11px] font-semibold text-wac-orange hover:underline"
                      >
                        service@waclogistics.com
                      </a>
                    </motion.div>
                  </div>

                  {/* Carrier list */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setShowAllCarriers((v) => !v)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-[12px] font-bold text-wac-navy hover:bg-slate-50"
                    >
                      Compare all {quotes.length} carriers
                      <ChevronDown
                        className={`h-4 w-4 transition ${showAllCarriers ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence>
                      {showAllCarriers && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100"
                        >
                          <div className="max-h-[320px] overflow-auto">
                            {quotes.map((q, i) => (
                              <motion.div
                                key={q.code}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0 ${
                                  i === 0 ? 'bg-orange-50/50' : ''
                                }`}
                              >
                                <CarrierLogo
                                  code={q.code}
                                  name={q.name}
                                  color={q.color}
                                  logoSrc={q.logoSrc}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-bold text-wac-navy">
                                    {q.code} · {q.name}
                                  </p>
                                  <p className="truncate text-[10px] text-slate-400">
                                    {q.schedule}
                                  </p>
                                </div>
                                <p className="font-display text-base font-extrabold text-wac-navy">
                                  ${q.total.toFixed(2)}
                                </p>
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRequestQuote(q)}
                                    className="rounded bg-wac-navy px-2 py-1 text-[9px] font-bold text-white"
                                  >
                                    Request
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyEmailDraft(q)}
                                    className="rounded border border-slate-200 p-1 text-slate-500 hover:border-wac-orange"
                                    title="Copy email draft"
                                  >
                                    {copied === q.code ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <p className="text-[10px] leading-relaxed text-slate-400">
                    * Indicative air freight only — non-binding. Monthly Master
                    refresh. Origin local, trucking &amp; special handling via WAC
                    Desk or formal quote.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
