'use client'

import { useEffect, useState } from 'react'
import { formatVolume, readStoredUnits, unitLabel } from '@/lib/units'

export default function ShareButton({
  title,
  dayName,
  totalSets,
  totalVolumeLbs,
  prCount,
}: {
  title: string
  dayName: string
  totalSets: number
  totalVolumeLbs: number
  prCount: number
}) {
  const [mode, setMode] = useState<'none' | 'share' | 'copy'>('none')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function sync() {
      if (typeof navigator === 'undefined') return
      if (typeof navigator.share === 'function') {
        setMode('share')
      } else if (navigator.clipboard) {
        setMode('copy')
      }
    }
    sync()
  }, [])

  if (mode === 'none') return null

  function buildText() {
    const unit = readStoredUnits()
    const volume = formatVolume(totalVolumeLbs, unit)
    return `${dayName} done — ${totalSets} set${totalSets === 1 ? '' : 's'}, ${volume} ${unitLabel(unit)} moved${
      prCount > 0 ? `, ${prCount} PR${prCount === 1 ? '' : 's'}` : ''
    }.`
  }

  async function handleClick() {
    const text = buildText()
    if (mode === 'share') {
      try {
        await navigator.share({ title, text })
      } catch {
        // user cancelled the share sheet — not an error
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — silently no-op
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="border-r-2 border-neutral-700 px-4 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] text-left text-[13px] font-extrabold tracking-[0.06em] text-bg uppercase hover:bg-bg/[0.07] active:bg-bg/[0.14] md:pb-5"
    >
      {mode === 'copy' && copied ? 'Copied' : 'Share'}
    </button>
  )
}
