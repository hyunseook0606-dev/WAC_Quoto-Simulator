import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Calculator,
  Check,
  FileText,
  Loader2,
  PackageSearch,
  Plane,
} from 'lucide-react'
import { Reveal } from '../chrome'

const STEP_MS = 4500

const STEPS = [
  {
    id: 'quote',
    n: '01',
    label: 'Quote',
    title: 'Get an instant air quote',
    desc: 'Tell us the lane and cargo size. We calculate chargeable weight and compare regional carriers — pick the best total in seconds.',
    bullets: ['From / To airport', 'Pieces, L×W×H and gross kg', 'Chargeable weight, then live rates'],
  },
  {
    id: 'desk',
    n: '02',
    label: 'Confirm',
    title: 'Confirm origin cost with WAC',
    desc: 'Air is only part of the bill. WAC Desk adds terminal, docs and local charges so you book on a complete, transparent total.',
    bullets: ['Air plus origin locals', 'One total to confirm', 'WAC books the space'],
  },
  {
    id: 'docs',
    n: '03',
    label: 'Docs',
    title: 'Issue shipment documents',
    desc: 'After booking: House AWB, Master AWB, commercial invoice and packing list — the files customs and the consignee need.',
    bullets: ['House & Master AWB', 'Commercial invoice', 'Packing list'],
  },
  {
    id: 'track',
    n: '04',
    label: 'Track',
    title: 'Follow the shipment',
    desc: 'Cargo is moving. Enter the AWB to see actual vs estimated milestones — warehouse, departed, arrived, delivered.',
    bullets: ['Paste the air waybill', 'Milestones with ACT vs EST', 'Event log until delivery'],
  },
] as const

type StepId = (typeof STEPS)[number]['id']

const DEMO_RATES = [
  { code: 'CX', name: 'Cathay Pacific', kg: 4.2, total: 2153, best: true },
  { code: 'KE', name: 'Korean Air', kg: 4.45, total: 2281, best: false },
  { code: 'OZ', name: 'Asiana Airlines', kg: 4.6, total: 2358, best: false },
]

function QuoteDemo() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'input' | 'cw' | 'load' | 'rates'>('input')

  useEffect(() => {
    const a = window.setTimeout(() => setPhase('cw'), 550)
    const b = window.setTimeout(() => setPhase('load'), 1050)
    const c = window.setTimeout(() => setPhase('rates'), 1550)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
      window.clearTimeout(c)
    }
  }, [])

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="text-[10px] font-semibold text-slate-400">Instant Quote · HKG → ICN</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="h-10 rounded-lg border-2 border-slate-200 bg-slate-50 text-center text-[13px] leading-10 font-extrabold tracking-[0.18em]">HKG</div>
          <Plane className="mb-2.5 h-4 w-4 text-wac-orange" />
          <div className="h-10 rounded-lg border-2 border-slate-200 bg-slate-50 text-center text-[13px] leading-10 font-extrabold tracking-[0.18em]">ICN</div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[['L', '120'], ['W', '100'], ['H', '60'], ['kg', '83.6']].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">{k}</p>
              <p className="text-[12px] font-extrabold">{v}</p>
            </div>
          ))}
        </div>
        <div className={`mt-3 rounded-xl px-3 py-2 text-[11px] ${phase === 'input' ? 'bg-slate-50 text-slate-400' : 'bg-emerald-50 font-extrabold text-emerald-800'}`}>
          Chargeable {phase === 'input' ? '—' : '120.0 kg'} · Gross 83.6 · Vol 120.0
        </div>
        <div className="mt-3 min-h-[120px]">
          {phase === 'load' && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin text-wac-orange" />
              <span className="text-[12px] font-semibold text-slate-500">Searching CX · KE · OZ…</span>
            </div>
          )}
          {phase === 'rates' && (
            <div className="space-y-1.5">
              {DEMO_RATES.map((r) => (
                <div key={r.code} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[12px] ${r.best ? 'border-wac-orange/45 bg-orange-50/80' : 'border-slate-100'}`}>
                  <span className="w-7 font-extrabold">{r.code}</span>
                  <span className="flex-1 truncate text-slate-500">{r.name}</span>
                  <span className="font-extrabold">USD {r.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => navigate('/quote?from=HKG&to=ICN')} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-wac-orange text-[13px] font-extrabold text-white">
          Try Instant Quote <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function DeskDemo() {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400">WAC Desk · origin cost</div>
      <div className="p-4 sm:p-5">
        <div className="space-y-2 text-[13px]">
          {[['Air freight', 'HKD 8,420'], ['Terminal / handling', 'HKD 640'], ['Documentation', 'HKD 280'], ['Cartage', 'HKD 708']].map(([k, v]) => (
            <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-extrabold">{v}</span></div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-2">
            <span className="font-bold">Shipper total</span>
            <span className="font-extrabold text-wac-orange">HKD 10,048</span>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/quote?mode=desk')} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-wac-navy text-[13px] font-extrabold text-white">
          <Calculator className="h-4 w-4" /> Open WAC Desk
        </button>
      </div>
    </div>
  )
}

function DocsDemo() {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400">Shipment documents</div>
      <div className="p-4 sm:p-5">
        {['House AWB', 'Master AWB', 'Commercial Invoice', 'Packing List'].map((name) => (
          <div key={name} className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0">
            <FileText className="h-4 w-4 text-wac-orange" />
            <span className="text-[13px] font-bold">{name}</span>
            <span className="ml-auto text-[11px] text-slate-400">PDF</span>
          </div>
        ))}
        <button type="button" onClick={() => navigate('/track?awb=160-12345675')} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-wac-navy text-[13px] font-extrabold text-white">
          Open shipment files <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function TrackDemo() {
  const navigate = useNavigate()
  const [awb, setAwb] = useState('160-12345675')
  return (
    <form className="overflow-hidden rounded-2xl bg-white shadow-xl" onSubmit={(e) => { e.preventDefault(); navigate(`/track?awb=${encodeURIComponent(awb)}`) }}>
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400">Track AWB</div>
      <div className="p-4 sm:p-5">
        <div className="flex h-10 rounded-lg border border-slate-200">
          <PackageSearch className="ml-3 h-4 w-4 self-center text-slate-400" />
          <input value={awb} onChange={(e) => setAwb(e.target.value)} className="min-w-0 flex-1 px-2 text-sm font-semibold outline-none" />
        </div>
        <div className="mt-3 space-y-2">
          {[['Booking confirmed', 'ACT', true], ['Received at warehouse', 'ACT', true], ['Departed origin', 'ACT', true], ['Arrived destination', 'EST', false]].map(([s, tag, done]) => (
            <div key={s as string} className="flex items-center gap-2 text-[12px]">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>{done ? <Check className="h-2.5 w-2.5" /> : null}</span>
              <span className="font-semibold">{s}</span>
              <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-extrabold ${tag === 'ACT' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{tag}</span>
            </div>
          ))}
        </div>
        <button type="submit" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-wac-navy text-[13px] font-extrabold text-white">
          Open tracking <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}

function StepDemo({ id }: { id: StepId }) {
  if (id === 'quote') return <QuoteDemo />
  if (id === 'desk') return <DeskDemo />
  if (id === 'docs') return <DocsDemo />
  return <TrackDemo />
}

/** STEP 01–04 shipper journey — auto-advances */
export function ProductSteps() {
  const [index, setIndex] = useState(0)
  const step = STEPS[index]

  useEffect(() => {
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % STEPS.length), STEP_MS)
    return () => window.clearTimeout(t)
  }, [index])

  return (
    <section id="platform" className="bg-[#F3F4F6] py-24 sm:py-28">
      <div className="mx-auto max-w-[1120px] px-6 lg:px-10">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-extrabold text-wac-navy sm:text-[36px]">
            How a shipper uses WAC
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-[15px] text-slate-500">
            Quote → confirm origin cost → documents → track
          </p>
        </Reveal>

        <div className="mt-10 flex justify-center gap-8 border-b border-slate-200 sm:gap-14" role="tablist">
          {STEPS.map((s, i) => (
            <button key={s.id} type="button" role="tab" aria-selected={i === index} onClick={() => setIndex(i)}
              className={`relative pb-3 text-[13px] font-extrabold sm:text-[15px] ${i === index ? 'text-wac-orange' : 'text-slate-400 hover:text-wac-navy'}`}>
              STEP {s.n}
              {i === index && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-orange-100">
                  <span key={`${s.id}-${index}`} className="step-progress block h-full bg-wac-orange" />
                </span>
              )}
            </button>
          ))}
        </div>

        <Reveal delay={80}>
          <div className="relative mt-8 overflow-hidden rounded-[1.5rem] bg-[#E8EAED]">
            <div className="grid items-center lg:grid-cols-2">
              <div className="flex flex-col justify-center px-7 py-10 sm:px-12">
                <AnimatePresence mode="wait">
                  <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                    <p className="text-[13px] font-extrabold text-wac-orange">{step.label}</p>
                    <h3 className="mt-2 text-[24px] font-extrabold text-wac-navy sm:text-[30px]">{step.title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-slate-500 sm:text-[15px]">{step.desc}</p>
                    <ol className="mt-5 space-y-2">
                      {step.bullets.map((b, i) => (
                        <li key={b} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-wac-orange">{i + 1}</span>
                          {b}
                        </li>
                      ))}
                    </ol>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="px-6 pb-8 sm:px-8 lg:py-10 lg:pr-10">
                <AnimatePresence mode="wait">
                  <motion.div key={step.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.22 }}>
                    <StepDemo id={step.id} />
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
