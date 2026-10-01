'use client'

import { useEffect, useState } from 'react'

// Dates render on the client so they follow the viewer's timezone.

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    function sync() {
      setMounted(true)
    }
    sync()
  }, [])
  return mounted
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

// This month as a 7-column strip (Mon first): trained, rest, today.
export function MonthStrip({ dates }: { dates: string[] }) {
  const mounted = useMounted()
  if (!mounted) return <div className="h-[60px]" />

  const now = new Date()
  const trained = new Set(dates.map((iso) => dayKey(new Date(iso))))
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  const label = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="k text-accent">{label}</div>
      <div className="mt-[11px] grid grid-cols-7 gap-[3px]">
        {Array.from({ length: offset }, (_, i) => (
          <i key={`pad${i}`} className="block h-[22px]" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
          const isToday = i + 1 === now.getDate()
          const isFuture = i + 1 > now.getDate()
          const didTrain = trained.has(dayKey(d))
          return (
            <i
              key={i}
              title={d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              className={`block h-[22px] ${isToday ? 'bg-accent' : didTrain ? 'bg-bg' : isFuture ? 'border border-neutral-800' : 'bg-neutral-800'}`}
            />
          )
        })}
      </div>
    </div>
  )
}

// The 44px date column: day number over weekday.
export function DayStamp({ iso }: { iso: string }) {
  const mounted = useMounted()
  const d = new Date(iso)
  return (
    <>
      <div className="num text-[26px] leading-none font-black">{mounted ? String(d.getDate()).padStart(2, '0') : '––'}</div>
      <div className="k text-neutral-500">{mounted ? d.toLocaleDateString(undefined, { weekday: 'short' }) : ''}</div>
    </>
  )
}

export function MonthYear({ iso }: { iso: string }) {
  const mounted = useMounted()
  if (!mounted) return null
  return <>{new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</>
}
