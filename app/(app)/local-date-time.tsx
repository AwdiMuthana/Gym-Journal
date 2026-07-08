'use client'

import { useEffect, useState } from 'react'

type Variant = 'relative' | 'full' | 'short'

export default function LocalDateTime({
  iso,
  variant = 'relative',
}: {
  iso: string
  variant?: Variant
}) {
  const [text, setText] = useState('—')

  useEffect(() => {
    const d = new Date(iso)
    const now = new Date()

    if (variant === 'full') {
      const date = d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const time = d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
      setText(`${date} · ${time}`)
      return
    }

    if (variant === 'short') {
      setText(
        d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
        })
      )
      return
    }

    const diffDays = Math.floor(
      (new Date(now.toDateString()).getTime() -
        new Date(d.toDateString()).getTime()) /
        86400000
    )
    const time = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    let dateLabel: string
    if (diffDays === 0) dateLabel = 'Today'
    else if (diffDays === 1) dateLabel = 'Yesterday'
    else if (diffDays < 7)
      dateLabel = d.toLocaleDateString(undefined, { weekday: 'long' })
    else
      dateLabel = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
      })
    setText(`${dateLabel} · ${time}`)
  }, [iso, variant])

  return <>{text}</>
}