'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/log', label: 'Log', short: 'Log' },
  { href: '/plan', label: 'Plan', short: 'Plan' },
  { href: '/history', label: 'History', short: 'Hist' },
  { href: '/stats', label: 'Stats', short: 'Stats' },
]

// An active workout (/log/<dayId>) lays itself out edge to edge.
export function isSessionRoute(pathname: string) {
  return pathname.startsWith('/log/')
}

// The workout and its summary own the whole screen: no header, no tabs.
function isFullscreenRoute(pathname: string) {
  return isSessionRoute(pathname) || pathname === '/stats/last-workout'
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function HideOnSession({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isFullscreenRoute(pathname)) return null
  return <>{children}</>
}

// Mobile: pinned to the bottom, four equal cells split by 2px rules.
export default function Tabs() {
  const pathname = usePathname()
  if (isFullscreenRoute(pathname)) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-2 border-neutral-700 bg-ink md:hidden">
      {TABS.map((tab, i) => {
        const active = isActive(pathname, tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`px-3 pt-3.5 pb-[max(26px,env(safe-area-inset-bottom))] text-[11px] font-extrabold uppercase tracking-[0.1em] ${
              i !== TABS.length - 1 ? 'border-r-2 border-neutral-700' : ''
            } ${active ? 'bg-bg text-ink' : 'text-neutral-500 hover:text-bg'}`}
          >
            {tab.short}
          </Link>
        )
      })}
    </nav>
  )
}

// Desktop: the same tabs as a segmented row inside the header.
export function DesktopNav() {
  const pathname = usePathname()
  return (
    <nav className="hidden md:flex">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`k px-[18px] py-[9px] ${active ? 'bg-bg text-ink' : 'text-neutral-500 hover:text-bg'}`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

// Screens get the 18px (mobile) / 28px (desktop) gutter and clear the pinned
// tab bar. The session screen lays itself out edge to edge.
export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isSessionRoute(pathname)) {
    return <main className="mx-auto w-full max-w-[1180px]">{children}</main>
  }
  return (
    <main key={pathname} className="screen-in mx-auto w-full max-w-[1180px] px-[18px] pt-6 pb-32 md:px-7 md:pb-12">
      {children}
    </main>
  )
}
