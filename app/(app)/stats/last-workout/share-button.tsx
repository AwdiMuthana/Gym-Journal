'use client'

import { useEffect, useState } from 'react'

export default function ShareButton({ title, text }: { title: string; text: string }) {
  const [mode, setMode] = useState<'none' | 'share' | 'copy'>('none')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (typeof navigator.share === 'function') {
      setMode('share')
    } else if (navigator.clipboard) {
      setMode('copy')
    }
  }, [])

  if (mode === 'none') return null

  async function handleClick() {
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
      className="w-full border-2 border-neutral-700 px-3 py-4 text-sm font-black uppercase tracking-wide text-bg hover:border-accent hover:text-accent"
    >
      {mode === 'copy' && copied ? 'Copied' : 'Share'}
    </button>
  )
}
