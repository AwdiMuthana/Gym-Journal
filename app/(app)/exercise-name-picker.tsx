'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MUSCLE_GROUPS,
  exercisesByMuscle,
  matchesQuery,
  searchExerciseDb,
} from '@/lib/exercises'

type RecentExercise = { name: string; session_count: number }

type Props = {
  recent: RecentExercise[]
  placeholder?: string
  autoFocus?: boolean
  className?: string
  // Uncontrolled / plain <form action={...}> usage: renders a hidden input
  // with this field name, so it drops into an existing form untouched.
  name?: string
  defaultValue?: string
  // Controlled usage for client components driving their own state.
  value?: string
  onChange?: (name: string) => void
}

const inputClasses =
  'w-full border-2 border-neutral-700 bg-transparent px-3 py-2.5 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none'

function normalize(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export default function ExerciseNamePicker({
  recent,
  placeholder,
  autoFocus,
  className,
  name,
  defaultValue,
  value,
  onChange,
}: Props) {
  const isControlled = value !== undefined && onChange !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const text = isControlled ? value : internalValue
  const setText = isControlled ? onChange : setInternalValue

  const [open, setOpen] = useState(false)
  const [muscle, setMuscle] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [])

  const tokens = useMemo(() => text.toLowerCase().trim().split(/\s+/).filter(Boolean), [text])
  const hasQuery = tokens.length > 0

  const recentMatches = useMemo(() => {
    const list = hasQuery ? recent.filter((r) => matchesQuery(r.name, tokens)) : recent
    return list.slice(0, 8)
  }, [recent, tokens, hasQuery])

  const recentKeys = useMemo(
    () => new Set(recentMatches.map((r) => normalize(r.name))),
    [recentMatches]
  )

  const dbMatches = useMemo(() => {
    if (!hasQuery) return []
    return searchExerciseDb(text, 20).filter((e) => !recentKeys.has(normalize(e.name)))
  }, [text, hasQuery, recentKeys])

  const muscleResults = useMemo(() => {
    if (hasQuery || !muscle) return []
    return exercisesByMuscle(muscle)
  }, [muscle, hasQuery])

  function choose(chosenName: string) {
    const trimmed = chosenName.trim()
    if (!trimmed) return
    setText(trimmed)
    setOpen(false)
    setMuscle(null)
  }

  const trimmedValue = text.trim()

  return (
    <div ref={containerRef}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? 'Exercise name'}
        autoFocus={autoFocus}
        autoComplete="off"
        className={className ?? inputClasses}
      />
      {!isControlled && name && <input type="hidden" name={name} value={text} />}

      {open && (
        <div className="max-h-80 overflow-y-auto border-2 border-t-0 border-neutral-700 bg-ink">
          {hasQuery ? (
            <>
              <button
                type="button"
                onClick={() => choose(trimmedValue)}
                className="block w-full border-b-2 border-neutral-800 px-3 py-3 text-left text-sm font-extrabold uppercase tracking-wide text-accent hover:bg-neutral-900"
              >
                Use &quot;{trimmedValue}&quot;
              </button>
              {recentMatches.map((r) => (
                <button
                  key={`recent-${r.name}`}
                  type="button"
                  onClick={() => choose(r.name)}
                  className="flex w-full items-center justify-between gap-2 border-b-2 border-neutral-800 px-3 py-2.5 text-left hover:bg-neutral-900"
                >
                  <span className="font-bold uppercase tracking-tight text-bg">{r.name}</span>
                  <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-neutral-500">
                    Yours
                  </span>
                </button>
              ))}
              {dbMatches.map((e) => (
                <button
                  key={`db-${e.name}`}
                  type="button"
                  onClick={() => choose(e.name)}
                  className="block w-full border-b-2 border-neutral-800 px-3 py-2.5 text-left hover:bg-neutral-900"
                >
                  <span className="font-bold uppercase tracking-tight text-bg">{e.name}</span>
                  <span className="block text-[10px] font-extrabold uppercase tracking-wide text-neutral-500">
                    {e.muscle} · {e.equipment}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <>
              {recentMatches.length > 0 && (
                <div>
                  <p className="px-3 pt-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                    Your exercises
                  </p>
                  {recentMatches.map((r) => (
                    <button
                      key={`recent-${r.name}`}
                      type="button"
                      onClick={() => choose(r.name)}
                      className="block w-full border-b-2 border-neutral-800 px-3 py-2.5 text-left font-bold uppercase tracking-tight text-bg hover:bg-neutral-900"
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="p-2.5">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                  Browse by muscle
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMuscle((cur) => (cur === m ? null : m))}
                      className={`border-2 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        muscle === m ? 'border-accent text-accent' : 'border-neutral-700 text-neutral-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {muscleResults.length > 0 && (
                <div className="border-t-2 border-neutral-800">
                  {muscleResults.map((e) => (
                    <button
                      key={`muscle-${e.name}`}
                      type="button"
                      onClick={() => choose(e.name)}
                      className="block w-full border-b-2 border-neutral-800 px-3 py-2.5 text-left hover:bg-neutral-900"
                    >
                      <span className="font-bold uppercase tracking-tight text-bg">{e.name}</span>
                      <span className="block text-[10px] font-extrabold uppercase tracking-wide text-neutral-500">
                        {e.equipment}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
