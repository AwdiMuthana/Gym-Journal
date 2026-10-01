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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// This month as a 7-column calendar (Mon first): trained, rest, today.
export function MonthStrip({ dates }: { dates: string[] }) {
  const mounted = useMounted()
  if (!mounted) return <div className="h-[200px]" />

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
        {WEEKDAYS.map((d) => (
          <div key={d} className="k pb-1 text-neutral-500">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <i key={`pad${i}`} className="block h-[34px]" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = i + 1
          const d = new Date(now.getFullYear(), now.getMonth(), date)
          const isToday = date === now.getDate()
          const isFuture = date > now.getDate()
          const didTrain = trained.has(dayKey(d))
          return (
            <div
              key={i}
              title={d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              className={`num flex h-[34px] items-start px-1.5 pt-1 text-[11px] font-extrabold ${
                isToday
                  ? 'bg-accent text-bg'
                  : didTrain
                    ? 'bg-bg text-ink'
                    : isFuture
                      ? 'border border-neutral-800 text-neutral-600'
                      : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {date}
            </div>
          )
        })}
      </div>
      <div className="k mt-2.5 flex gap-3 text-neutral-500">
        <span className="flex items-center gap-1.5"><i className="block h-2.5 w-2.5 bg-bg" />Trained</span>
        <span className="flex items-center gap-1.5"><i className="block h-2.5 w-2.5 bg-neutral-800" />Rest</span>
        <span className="flex items-center gap-1.5"><i className="block h-2.5 w-2.5 bg-accent" />Today</span>
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
