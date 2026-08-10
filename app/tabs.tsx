'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/log', label: 'Log' },
  { href: '/plan', label: 'Plan' },
  { href: '/history', label: 'History' },
  { href: '/stats', label: 'Stats' },
]

export default function Tabs() {
  const pathname = usePathname()

  return (
    <nav className="border-b-2 border-neutral-800 bg-ink">
      <div className="mx-auto flex max-w-2xl">
        {TABS.map((tab, i) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 px-4 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] transition ${
                i !== TABS.length - 1 ? 'border-r-2 border-neutral-800' : ''
              } ${
                isActive
                  ? 'bg-bg text-ink'
                  : 'text-neutral-500 hover:text-bg'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}