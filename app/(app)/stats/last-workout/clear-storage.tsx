'use client'

import { useEffect } from 'react'

export default function ClearSessionStorage({ dayId }: { dayId?: string }) {
  useEffect(() => {
    if (!dayId) return
    try {
      localStorage.removeItem(`gym-journal:session:${dayId}`)
    } catch {}
  }, [dayId])
  return null
}