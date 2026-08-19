import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronRight, Lock } from 'lucide-react'

export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.unobserve(el)
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function WacLogoMark({ className = 'h-9' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-display text-xl leading-none font-extrabold tracking-widest">
        WAC
      </span>
      <span className="text-[10px] font-semibold tracking-[0.22em] opacity-70">
        LOGISTICS
      </span>
    </span>
  )
}

export function WacLogo({
  variant = 'color',
  className = 'h-9',
}: {
  variant?: 'color' | 'white'
  className?: string
}) {
  const [imgFailed, setImgFailed] = useState(false)

  if (variant === 'color') {
    if (imgFailed) return <WacLogoMark className={className} />
    return (
      <img
        src="/wac-logo.png"
        alt="WAC Logistics"
        className={`${className} w-auto object-contain`}
        onError={() => setImgFailed(true)}
      />
    )
  }

  if (imgFailed) {
    return (
      <span className={`inline-flex items-baseline gap-2 text-white ${className}`}>
        <span className="font-display text-xl leading-none font-extrabold tracking-widest">
          WAC
        </span>
        <span className="text-[10px] font-semibold tracking-[0.22em] text-white/65">
          LOGISTICS
        </span>
      </span>
    )
  }

  return (
    <img
      src="/wac-logo-white.png"
      alt="WAC Logistics"
      className={`${className} w-auto object-contain opacity-90`}
      onError={() => setImgFailed(true)}
    />
  )
}

const NAV = [
  { to: '/quote', label: 'Get a Quote' },
  { to: '/track', label: 'Track' },
  { to: '/#solutions', label: 'Solutions' },
  { to: '/#platform', label: 'How it works' },
  { to: '/#tailored', label: 'Tailored' },
  { to: '/#about', label: 'About' },
] as const

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  const solid = !overlay || scrolled

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 border-b transition ${
        solid
          ? 'border-slate-200/80 bg-white/95 backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-6 lg:px-8">
        <Link to="/" className="shrink-0" aria-label="WAC Logistics home">
          <WacLogo variant={solid ? 'color' : 'white'} className="h-8 sm:h-9" />
        </Link>
        <nav
          className={`hidden items-center gap-7 text-[13px] font-semibold lg:flex ${
            solid ? 'text-wac-navy' : 'text-white'
          }`}
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition hover:text-wac-orange ${
                  isActive && !item.to.includes('#') ? 'text-wac-orange' : ''
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/quote?mode=desk"
            className={`hidden items-center gap-1 rounded border px-3 py-2 text-[12px] font-bold transition sm:inline-flex ${
              solid
                ? 'border-slate-200 bg-white text-wac-navy hover:border-wac-orange hover:text-wac-orange'
                : 'border-white/40 bg-white/10 text-white hover:border-wac-orange hover:text-wac-orange'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Desk
          </Link>
          <Link
            to="/quote"
            className="inline-flex items-center gap-1 rounded bg-wac-orange px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-[#d9441c]"
          >
            Get Quote
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-wac-navy">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <WacLogo variant="white" className="h-7" />
          <p className="mt-4 text-[12px] leading-relaxed text-white/50">
            WAC Int&apos;l Logistics Co., Ltd.
            <br />
            Delivering Asia, Delivering Trust.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-[12px] font-bold tracking-wider text-white uppercase">
            Products
          </h4>
          <ul className="space-y-2 text-[13px] text-white/55">
            <li>
              <Link to="/quote" className="hover:text-wac-orange">
                Instant Quote
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-wac-orange">
                Track shipment
              </Link>
            </li>
            <li>
              <Link to="/quote?mode=desk" className="hover:text-wac-orange">
                WAC Desk
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-[12px] font-bold tracking-wider text-white uppercase">
            Company
          </h4>
          <ul className="space-y-2 text-[13px] text-white/55">
            <li>
              <a href="http://www.waclogistics.com/" target="_blank" rel="noreferrer">
                About Us
              </a>
            </li>
            <li>
              <Link to="/#network">Network</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-[12px] font-bold tracking-wider text-white uppercase">
            Contact
          </h4>
          <ul className="space-y-2 text-[13px] text-white/55">
            <li>
              <a href="mailto:service@waclogistics.com">service@waclogistics.com</a>
            </li>
            <li>
              <Link to="/quote" className="font-semibold text-wac-orange hover:underline">
                Instant Quote
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-4 lg:px-8">
          <p className="text-[11px] text-white/40">
            © WAC Int&apos;l Logistics Co., Ltd. All Rights Reserved.
          </p>
          <p className="text-[11px] text-white/35">
            Rates from Excel Master_DB · Prototype
          </p>
        </div>
      </div>
    </footer>
  )
}
