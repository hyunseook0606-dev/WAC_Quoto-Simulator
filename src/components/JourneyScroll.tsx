import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Calculator,
  Lock,
  PackageSearch,
  Plane,
} from 'lucide-react'

type HeroTab = 'quote' | 'track' | 'desk'

const TABS: { id: HeroTab; label: string }[] = [
  { id: 'quote', label: 'Get a Quote' },
  { id: 'track', label: 'Track AWB' },
  { id: 'desk', label: 'WAC Desk' },
]

const LANES = [
  ['HKG', 'ICN'],
  ['ICN', 'LAX'],
  ['SIN', 'HKG'],
  ['ICN', 'HKG'],
] as const

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.12 + i * 0.12, ease },
  }),
}

/** Soft world-map outline — decorative only */
function HeroWorldMap() {
  return (
    <svg
      viewBox="0 0 1200 560"
      className="absolute inset-0 h-full w-full"
      fill="none"
      aria-hidden
    >
      <g
        stroke="#1A2A3A"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.055"
      >
        <path d="M180 210c40-55 95-78 155-72 48 5 88 32 118 68 22 26 48 42 82 38 36-4 62-28 78-58 18-34 48-52 88-48 52 5 92 42 118 88 18 32 52 52 92 48 28-3 52-18 72-38" />
        <path d="M210 320c28-18 62-22 92-8 36 16 58 48 72 84 8 22 28 38 52 42 34 6 62-12 78-40 22-38 58-58 102-52 40 5 72 32 92 64" />
        <path d="M520 180c22-32 58-48 98-42 48 7 82 42 102 82 12 24 36 40 64 42 42 3 78-22 98-56" />
        <path d="M680 300c34-8 68 8 88 38 22 32 58 48 98 42 48-7 82-42 98-82" />
        <path d="M140 380c48 12 98 8 142-18 36-22 78-28 118-12 42 16 78 12 112-12" />
        <circle cx="320" cy="250" r="3.5" fill="#1A2A3A" opacity="0.12" />
        <circle cx="620" cy="220" r="3.5" fill="#1A2A3A" opacity="0.12" />
        <circle cx="860" cy="280" r="3.5" fill="#1A2A3A" opacity="0.12" />
        <path d="M320 250h300M620 220h240" strokeDasharray="4 6" opacity="0.55" />
      </g>
    </svg>
  )
}

function HeroActionWidget() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<HeroTab>('quote')
  const [origin, setOrigin] = useState('HKG')
  const [destination, setDestination] = useState('ICN')
  const [awb, setAwb] = useState('160-12345675')

  const goQuote = (mode?: 'desk') => {
    const from = origin.trim().toUpperCase() || 'HKG'
    const to = destination.trim().toUpperCase() || 'ICN'
    const qs = new URLSearchParams({ from, to })
    if (mode === 'desk') qs.set('mode', 'desk')
    navigate(`/quote?${qs.toString()}`)
  }

  const goTrack = (e: FormEvent) => {
    e.preventDefault()
    const value = awb.trim() || '160-12345675'
    navigate(`/track?awb=${encodeURIComponent(value)}`)
  }

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-white/70 bg-white/95 text-left shadow-2xl shadow-slate-900/12 backdrop-blur-sm">
      <div
        className="grid grid-cols-3 border-b border-slate-200"
        role="tablist"
        aria-label="Hero actions"
      >
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`relative px-2 py-4 text-[12px] font-extrabold tracking-wide transition sm:text-[14px] ${
                active
                  ? 'bg-white text-wac-navy'
                  : 'bg-slate-50/80 text-slate-500 hover:bg-white hover:text-wac-navy'
              }`}
            >
              {item.label}
              <span
                className={`absolute inset-x-3 bottom-0 h-[3px] rounded-full transition sm:inset-x-6 ${
                  active ? 'bg-wac-orange' : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>

      <div className="relative min-h-[248px] px-6 py-6 sm:px-8 sm:py-7">
        <AnimatePresence mode="wait">
          {tab === 'quote' && (
            <motion.form
              key="quote"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              onSubmit={(e) => {
                e.preventDefault()
                goQuote()
              }}
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Origin
                  </span>
                  <input
                    type="text"
                    maxLength={3}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                    placeholder="HKG"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-extrabold tracking-[0.22em] text-wac-navy outline-none transition focus:border-wac-orange focus:bg-white"
                  />
                </label>
                <Plane className="mb-3.5 h-5 w-5 text-wac-orange" />
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Destination
                  </span>
                  <input
                    type="text"
                    maxLength={3}
                    value={destination}
                    onChange={(e) =>
                      setDestination(e.target.value.toUpperCase())
                    }
                    placeholder="ICN"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-extrabold tracking-[0.22em] text-wac-navy outline-none transition focus:border-wac-orange focus:bg-white"
                  />
                </label>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {LANES.map(([o, d]) => (
                  <button
                    key={`${o}-${d}`}
                    type="button"
                    onClick={() => {
                      setOrigin(o)
                      setDestination(d)
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      origin === o && destination === d
                        ? 'border-wac-orange bg-orange-50 text-wac-orange'
                        : 'border-slate-200 text-slate-500 hover:border-wac-orange hover:text-wac-orange'
                    }`}
                  >
                    {o}→{d}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-wac-orange text-[14px] font-extrabold text-white transition hover:bg-[#d9441c]"
              >
                Get a Quote
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-[12px] text-slate-400">
                Compare carrier options in seconds — dimensions on the next step
              </p>
            </motion.form>
          )}

          {tab === 'track' && (
            <motion.form
              key="track"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              onSubmit={goTrack}
            >
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Air waybill number
              </label>
              <div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-wac-orange focus-within:bg-white">
                <span className="flex items-center pl-3.5 text-slate-400">
                  <PackageSearch className="h-[18px] w-[18px]" />
                </span>
                <input
                  value={awb}
                  onChange={(e) => setAwb(e.target.value)}
                  placeholder="e.g. 160-12345675"
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[15px] font-semibold tracking-wide text-wac-navy outline-none"
                />
                <button
                  type="submit"
                  className="m-1.5 rounded-lg bg-wac-navy px-5 text-[13px] font-extrabold text-white transition hover:bg-[#24384c]"
                >
                  Track
                </button>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
                Demo visibility — try 160-12345675 (In Transit), …74 Arrived,
                …73 Delivered.
              </p>
            </motion.form>
          )}

          {tab === 'desk' && (
            <motion.div
              key="desk"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Lock className="h-4 w-4 text-wac-navy" />
                </span>
                <div>
                  <p className="text-[15px] font-extrabold text-wac-navy">
                    Origin cost on the Master
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                    Variable slots, local charges and chargeable weight for
                    internal WAC Desk costing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => goQuote('desk')}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-wac-navy text-[14px] font-extrabold text-white transition hover:bg-[#24384c]"
              >
                <Calculator className="h-4 w-4" />
                Open WAC Desk
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Warm brand hero — WAC mark only, peach wash, staggered entrance like PantosNow */
export function JourneyScroll() {
  return (
    <section className="relative isolate overflow-hidden bg-[#F7ECEB] pt-28 pb-16 sm:pb-20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#F6E2DE_0%,_#F7ECEB_42%,_#F3F0EF_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-20 left-1/2 h-[460px] w-[780px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,_rgba(240,80,35,0.16),_transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <HeroWorldMap />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-8rem)] max-w-[680px] flex-col items-center justify-center px-6 text-center">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-5"
        >
          <img
            src="/wac-mark-hero.png"
            alt="WAC"
            className="mx-auto h-12 w-auto object-contain sm:h-14"
          />
        </motion.div>

        <motion.p
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-4 text-[11px] font-semibold tracking-[0.32em] text-wac-orange uppercase sm:text-[12px]"
        >
          Delivering Asia, Delivering Trust
        </motion.p>

        <motion.h1
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-[30px] leading-[1.18] font-extrabold text-wac-navy sm:text-[40px] lg:text-[44px]"
        >
          Instant Air Freight Quotes &amp; Tracking across Asia
        </motion.h1>

        <motion.p
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-500 sm:text-[16px]"
        >
          Compare live rates, track shipments, and calculate origin costs
          instantly — powered by exclusive regional carrier networks.
        </motion.p>

        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-9 w-full"
        >
          <HeroActionWidget />
        </motion.div>
      </div>
    </section>
  )
}
