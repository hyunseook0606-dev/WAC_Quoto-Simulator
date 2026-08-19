import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react'
import { Reveal } from '../chrome'

const SLIDE_MS = 5500

const SLIDES = [
  {
    id: 'quote',
    kicker: 'Your own',
    accent: 'tailored quote',
    headline: 'Built around your lane',
    desc: 'Save your corridors, cargo presets and carrier preferences — every request starts from your last shipment, not a blank form.',
  },
  {
    id: 'desk',
    kicker: 'Your own',
    accent: 'cost workspace',
    headline: 'Your desk, your slots',
    desc: 'Variable origin charges, FX and carrier choice in one sheet — tuned to how your team prices HKG, ICN and ASEAN lanes.',
  },
  {
    id: 'board',
    kicker: 'Your own',
    accent: 'shipment board',
    headline: 'Bookings you care about',
    desc: 'Active AWBs, document deadlines and status at a glance — the shipments that need action today, not every line in the system.',
  },
  {
    id: 'report',
    kicker: 'Your own',
    accent: 'lane summary',
    headline: 'Spend and volume by corridor',
    desc: 'Monthly uplift, chargeable weight and indicative spend by origin–destination — so you see where your air budget goes.',
  },
] as const

type SlideId = (typeof SLIDES)[number]['id']

function QuoteWorkspaceMock() {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(26,42,58,0.2)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <p className="text-[15px] font-extrabold text-wac-navy">My quote request</p>
        <span className="text-[11px] font-semibold text-slate-400">Saved lanes</span>
      </div>
      <div className="p-5">
        <p className="mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Transport</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {['Air general', 'Air special', 'Express'].map((m, i) => (
            <span
              key={m}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                i === 0
                  ? 'border-2 border-wac-orange text-wac-orange'
                  : 'border border-slate-200 text-slate-400'
              }`}
            >
              {m}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold text-slate-400 uppercase">Origin</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-bold">
              Hong Kong (HKG)
            </div>
            <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <input type="checkbox" readOnly checked className="accent-wac-orange" />
              Pickup at origin
            </label>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold text-slate-400 uppercase">Destination</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] font-bold">
              Seoul (ICN)
            </div>
            <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
              <input type="checkbox" readOnly className="accent-wac-orange" />
              Delivery at dest.
            </label>
          </div>
        </div>
        <p className="mb-1 mt-4 text-[10px] font-bold text-slate-400 uppercase">Your preset</p>
        <div className="rounded-xl border border-wac-orange/30 bg-orange-50/50 px-3 py-2.5 text-[12px]">
          <span className="font-bold text-wac-navy">1 PLT · 120×100×60 cm</span>
          <span className="text-slate-500"> · 83.6 kg · last used HKG→ICN</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/quote?from=HKG&to=ICN')}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-wac-orange text-[13px] font-extrabold text-white"
        >
          Open my quote
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function DeskWorkspaceMock() {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(26,42,58,0.2)]">
      <div className="border-b border-slate-100 px-5 py-3">
        <p className="text-[15px] font-extrabold text-wac-navy">My cost sheet</p>
        <p className="text-[11px] text-slate-400">Variable slots · HKG export</p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['X-ray', 'Off'],
            ['ULD', 'On'],
            ['WH reg', 'Off'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">{k}</p>
              <p className="text-[12px] font-extrabold text-wac-navy">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-[12px]">
          {[
            ['Carrier slot · CX', 'USD 4.20/kg'],
            ['Terminal (your rate)', 'HKD 640'],
            ['Doc fee (your slot)', 'HKD 280'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-500">{k}</span>
              <span className="font-bold">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-wac-navy px-4 py-3 text-white">
          <span className="text-[12px] font-bold">Your desk total</span>
          <span className="text-[16px] font-extrabold">HKD 10,048</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/quote?mode=desk')}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-wac-navy text-[12px] font-extrabold text-wac-navy"
        >
          Open WAC Desk
        </button>
      </div>
    </div>
  )
}

function BoardWorkspaceMock() {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(26,42,58,0.2)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <p className="text-[15px] font-extrabold text-wac-navy">My shipments</p>
        <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-wac-orange">
          <Bell className="h-3 w-3" /> 2 alerts
        </span>
      </div>
      <div className="p-4">
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[
            ['In transit', '3', 'bg-blue-50 text-blue-800'],
            ['Docs due', '1', 'bg-orange-50 text-wac-orange'],
            ['Delivered', '12', 'bg-emerald-50 text-emerald-800'],
          ].map(([l, n, c]) => (
            <div key={l as string} className={`rounded-xl p-2.5 text-center ${c}`}>
              <p className="text-[18px] font-extrabold">{n}</p>
              <p className="text-[9px] font-bold uppercase">{l}</p>
            </div>
          ))}
        </div>
        {[
          { awb: '160-12345675', lane: 'HKG → ICN', status: 'Departed', pct: 60 },
          { awb: '180-98765432', lane: 'ICN → LAX', status: 'Customs', pct: 40 },
        ].map((s) => (
          <div key={s.awb} className="mb-2 rounded-xl border border-slate-100 p-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-extrabold">{s.awb}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{s.status}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{s.lane}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-wac-orange" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => navigate('/track?awb=160-12345675')}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-wac-navy text-[12px] font-extrabold text-white"
        >
          Open my board
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function ReportWorkspaceMock() {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(26,42,58,0.2)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <p className="text-[15px] font-extrabold text-wac-navy">My lane report</p>
        <span className="text-[11px] text-slate-400">Aug 2026</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Uplift</p>
            <p className="text-[22px] font-extrabold text-wac-navy">
              847 <span className="text-[12px] font-semibold text-slate-400">kg C.W.</span>
            </p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3">
            <p className="text-[10px] font-bold text-wac-orange uppercase">Indicative spend</p>
            <p className="text-[22px] font-extrabold text-wac-orange">USD 18.2k</p>
          </div>
        </div>
        <p className="mb-2 mt-4 text-[10px] font-bold text-slate-400 uppercase">Top corridors</p>
        {[
          ['HKG → ICN', 42, 'w-[85%]'],
          ['ICN → LAX', 28, 'w-[55%]'],
          ['SIN → HKG', 18, 'w-[35%]'],
        ].map(([lane, pct, w]) => (
          <div key={lane as string} className="mb-2">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold">{lane}</span>
              <span className="text-slate-400">{pct}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-wac-navy ${w}`} />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => navigate('/quote')}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-wac-navy text-[12px] font-extrabold text-wac-navy"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Quote next lane
        </button>
      </div>
    </div>
  )
}

function SlideMock({ id }: { id: SlideId }) {
  if (id === 'quote') return <QuoteWorkspaceMock />
  if (id === 'desk') return <DeskWorkspaceMock />
  if (id === 'board') return <BoardWorkspaceMock />
  return <ReportWorkspaceMock />
}

export function TailoredFeatures() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const n = SLIDES.length

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + n) % n)

  useEffect(() => {
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % n), SLIDE_MS)
    return () => window.clearTimeout(t)
  }, [index, n])

  return (
    <section id="tailored" className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <Reveal>
          <h2 className="text-center text-[28px] font-extrabold text-wac-navy sm:text-[34px]">
            Smarter with a workspace built for you
          </h2>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-12 overflow-hidden rounded-[1.75rem] bg-[#F3F4F6] px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-14">
              <div className="flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.28 }}
                  >
                    <p className="text-[15px] font-semibold text-wac-navy">{slide.kicker}</p>
                    <h3 className="mt-2 text-[26px] leading-[1.25] font-extrabold text-wac-navy sm:text-[32px]">
                      <span className="text-wac-orange">{slide.accent}</span>
                      <br />
                      {slide.headline}
                    </h3>
                    <p className="mt-4 text-[14px] leading-relaxed text-slate-500 sm:text-[15px]">
                      {slide.desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-8 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm hover:border-wac-orange hover:text-wac-orange"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm hover:border-wac-orange hover:text-wac-orange"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="ml-2 text-[12px] font-semibold text-slate-400">
                    {index + 1} / {n}
                  </span>
                </div>
              </div>
              <div className="relative min-h-[400px] lg:min-h-[440px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.32 }}
                    className="lg:absolute lg:inset-0 lg:flex lg:items-center lg:justify-end"
                  >
                    <div className="w-full max-w-[500px] lg:ml-auto">
                      <SlideMock id={slide.id} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
