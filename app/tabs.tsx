'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/plan', label: 'Plan' },
  { href: '/log', label: 'Log' },
  { href: '/stats', label: 'Stats' },
]

export default function Tabs() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-800 bg-black">
      <div className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium transition ${
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
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