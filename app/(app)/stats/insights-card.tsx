'use client'

import { useState } from 'react'
import { getCoachingInsights } from '@/app/stats-actions'
import type { GeminiResult } from '@/lib/gemini'

export default function InsightsCard() {
  const [state, setState] = useState<'idle' | 'loading' | GeminiResult>('idle')

  async function requestInsights() {
    setState('loading')
    try {
      const result = await getCoachingInsights()
      setState(result)
    } catch {
      setState({ ok: false, reason: 'error', message: 'Something went wrong — try again in a moment.' })
    }
  }

  return (
    <div className="border-2 border-neutral-700 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-tight">AI coaching insights</p>
          <p className="text-[11px] text-neutral-500">Plateaus, progress, and what to try next</p>
        </div>
        {state !== 'loading' && (
          <button
            type="button"
            onClick={requestInsights}
            className="shrink-0 border-2 border-accent px-3 py-2 text-[11px] font-black uppercase tracking-wide text-accent hover:bg-accent hover:text-bg"
          >
            {state === 'idle' ? 'Get insights' : 'Refresh'}
          </button>
        )}
      </div>

      {state === 'idle' && (
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
          Tap &ldquo;Get insights&rdquo; for a quick AI read on your recent training.
        </p>
      )}

      {state === 'loading' && (
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">Thinking…</p>
      )}

      {state !== 'idle' && state !== 'loading' && state.ok && (
        <p className="text-sm leading-relaxed text-bg">{state.text}</p>
      )}

      {state !== 'idle' && state !== 'loading' && !state.ok && (
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">{state.message}</p>
      )}
    </div>
  )
}
