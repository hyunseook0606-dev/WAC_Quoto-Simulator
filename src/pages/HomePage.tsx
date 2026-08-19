import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ExternalLink,
  Plane,
} from 'lucide-react'
import { Reveal, SiteFooter, SiteHeader } from '../chrome'
import { JourneyScroll } from '../components/JourneyScroll'
import { ProductSteps } from '../components/ProductSteps'
import { TailoredFeatures } from '../components/TailoredFeatures'

const WAC_SITE = 'http://www.waclogistics.com/'

const SOLUTIONS = [
  {
    id: 'air',
    title: 'Air Freight',
    desc: 'Asia corridor uplift — Instant Quote from the monthly Master.',
    cover: '/services/air.png',
    href: '/quote',
    cta: 'Get a Quote',
    external: false,
  },
  {
    id: 'ocean',
    title: 'Ocean Freight',
    desc: 'FCL & LCL programs at major Asian ports.',
    cover: '/services/ocean.jpg',
    href: WAC_SITE,
    cta: 'View on WAC',
    external: true,
  },
  {
    id: 'road',
    title: 'Road Freight',
    desc: 'Cross-border trucking and last-mile linked to air and ocean.',
    cover: '/services/road.jpg',
    href: WAC_SITE,
    cta: 'View on WAC',
    external: true,
  },
  {
    id: 'warehouse',
    title: 'Warehousing',
    desc: 'Bonded and non-bonded inventory near gateway airports.',
    cover: '/services/warehouse.jpg',
    href: WAC_SITE,
    cta: 'View on WAC',
    external: true,
  },
  {
    id: 'ecom',
    title: 'E-Commerce',
    desc: 'Cross-border fulfillment via W Networks / Favvy.',
    cover: '/services/ecom.jpg',
    href: 'https://www.favvyhk.com/',
    cta: 'Visit Favvy',
    external: true,
  },
] as const

const W_NETWORKS = [
  {
    name: 'WAC LOGISTICS',
    desc: 'GLOBAL FORWARDER',
    url: 'https://www.waclogistics.com/',
    logo: '/network-1.jpg',
  },
  {
    name: 'W EXPRESS KOREA',
    desc: 'W NETWORKS KOREA',
    url: 'https://www.wexpresskr.com/',
    logo: '/network-2.jpg',
  },
  {
    name: 'W MOBILITY',
    desc: 'INTERNATIONAL MOVES',
    url: 'https://www.wmobility.global/',
    logo: '/network-3.jpg',
  },
  {
    name: 'W CLUB',
    desc: 'E-COMMERCE',
    url: 'https://www.conceptwhk.com/',
    logo: '/network-4.jpg',
  },
  {
    name: 'FAVVY',
    desc: 'ONLINE FASHION',
    url: 'https://www.favvyhk.com/',
    logo: '/network-5.jpg',
  },
] as const

function SolutionCard({
  item,
  delay,
}: {
  item: (typeof SOLUTIONS)[number]
  delay: number
}) {
  const inner = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
        <img
          src={item.cover}
          alt=""
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-wac-navy/80 via-wac-navy/10 to-transparent" />
        <h3 className="absolute bottom-4 left-5 font-display text-[20px] font-extrabold text-white">
          {item.title}
        </h3>
      </div>
      <div className="flex flex-1 flex-col px-5 py-4">
        <p className="flex-1 text-[13px] leading-relaxed text-slate-500">
          {item.desc}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-wac-navy group-hover:text-wac-orange">
          {item.cta}
          {item.external ? (
            <ExternalLink className="h-3.5 w-3.5" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </span>
      </div>
    </>
  )

  return (
    <Reveal delay={delay}>
      {item.external ? (
        <a
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="group flex h-full flex-col overflow-hidden bg-white"
        >
          {inner}
        </a>
      ) : (
        <Link
          to={item.href}
          className="group flex h-full flex-col overflow-hidden bg-white"
        >
          {inner}
        </Link>
      )}
    </Reveal>
  )
}

export function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-wac-navy">
      <SiteHeader />
      <JourneyScroll />

      <section id="solutions" className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <Reveal>
            <div className="mb-12 max-w-2xl">
              <p className="mb-3 text-[11px] font-bold tracking-[0.28em] text-wac-orange uppercase">
                Solutions
              </p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-wac-navy sm:text-4xl">
                End-to-end freight across Asia
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
                Air, ocean, road, warehousing and e-commerce — the same lineup
                as waclogistics.com, with Instant Quote leading on air.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.slice(0, 3).map((item, i) => (
              <SolutionCard key={item.id} item={item} delay={i * 70} />
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:w-[66.666%]">
              {SOLUTIONS.slice(3).map((item, i) => (
                <SolutionCard key={item.id} item={item} delay={220 + i * 70} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <ProductSteps />

      <TailoredFeatures />

      <section id="about" className="relative overflow-hidden bg-wac-navy py-28">
        <img
          src="/hero-cargo-takeoff.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-wac-navy via-wac-navy/80 to-wac-navy/50" />
        <div className="relative z-10 mx-auto max-w-[1200px] px-6">
          <Reveal>
            <p className="mb-4 text-[11px] font-bold tracking-[0.22em] text-wac-orange uppercase">
              About WAC
            </p>
            <h2 className="font-display max-w-3xl text-3xl font-extrabold text-white sm:text-4xl">
              Building trust to deliver value throughout Asia.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/75">
              Instant Quote and WAC Desk turn lane, pieces and dimensions into
              chargeable weight and Master rates — then origin cost for the desk.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={WAC_SITE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded bg-white px-5 py-3 text-[13px] font-bold text-wac-navy"
              >
                Visit waclogistics.com
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Link
                to="/quote"
                className="inline-flex items-center gap-2 rounded border border-white/40 px-5 py-3 text-[13px] font-bold text-white"
              >
                Get a Quote
                <Plane className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-[#F7F9FB] py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 text-[11px] font-bold tracking-[0.22em] text-wac-orange uppercase">
              Family sites
            </p>
            <h2 className="font-display text-2xl font-extrabold text-wac-navy">
              W NETWORKS
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {W_NETWORKS.map((net) => (
              <a
                key={net.name}
                href={net.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center hover:border-wac-orange/40"
              >
                <img
                  src={net.logo}
                  alt={net.name}
                  className="mb-3 h-20 w-full object-contain"
                />
                <p className="text-[12px] font-bold text-wac-navy">{net.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{net.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
