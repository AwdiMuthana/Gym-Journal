'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { finishSession } from '@/app/log-actions'
import type { DayWithExercises, Exercise } from '@/lib/types'

type LastSets = {
  performed_at: string
  sets: { weight: number | null; reps: number | null; notes: string | null }[]
} | null

type SetInput = {
  weight: string
  reps: string
  notes: string
}

type ExerciseLog = {
  exercise: Exercise
  last: LastSets
  sets: SetInput[]
}

type SavedState = Record<string, SetInput[]>

const storageKey = (dayId: string) => `gym-journal:session:${dayId}`

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function SessionForm({
  day,
  exercisesWithLast,
}: {
  day: DayWithExercises
  exercisesWithLast: { exercise: Exercise; last: LastSets }[]
}) {
  const [logs, setLogs] = useState<ExerciseLog[]>(() =>
    exercisesWithLast.map(({ exercise, last }) => ({
      exercise,
      last,
      sets: [],
    }))
  )
  const [restored, setRestored] = useState(false)

  // Restore in-progress workout from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(day.id))
      if (saved) {
        const parsed: SavedState = JSON.parse(saved)
        setLogs((prev) =>
          prev.map((log) => ({
            ...log,
            sets: parsed[log.exercise.id] ?? [],
          }))
        )
      }
    } catch {
      // ignore restore errors
    }
    setRestored(true)
  }, [day.id])

  // Auto-save to localStorage whenever logs change (after restore)
  useEffect(() => {
    if (!restored) return
    try {
      const hasAnySets = logs.some((log) => log.sets.length > 0)
      if (hasAnySets) {
        const toSave: SavedState = {}
        for (const log of logs) {
          if (log.sets.length > 0) toSave[log.exercise.id] = log.sets
        }
        localStorage.setItem(storageKey(day.id), JSON.stringify(toSave))
      } else {
        localStorage.removeItem(storageKey(day.id))
      }
    } catch {
      // ignore save errors
    }
  }, [logs, day.id, restored])

  function addSet(exIdx: number) {
    setLogs((prev) => {
      const next = [...prev]
      const ex = { ...next[exIdx] }
      const prevSet = ex.sets[ex.sets.length - 1]

      // Pre-fill from previous set, or fall back to last session's first set
      let prefillWeight = ''
      let prefillReps = ''
      if (prevSet) {
        prefillWeight = prevSet.weight
        prefillReps = prevSet.reps
      } else if (ex.last && ex.last.sets.length > 0) {
        const firstLast = ex.last.sets[0]
        prefillWeight = firstLast.weight !== null ? String(firstLast.weight) : ''
        prefillReps = firstLast.reps !== null ? String(firstLast.reps) : ''
      }

      ex.sets = [
        ...ex.sets,
        { weight: prefillWeight, reps: prefillReps, notes: '' },
      ]
      next[exIdx] = ex
      return next
    })
  }

  function removeSet(exIdx: number, setIdx: number) {
    setLogs((prev) => {
      const next = [...prev]
      const ex = { ...next[exIdx] }
      ex.sets = ex.sets.filter((_, i) => i !== setIdx)
      next[exIdx] = ex
      return next
    })
  }

  function updateSet(
    exIdx: number,
    setIdx: number,
    field: keyof SetInput,
    value: string
  ) {
    setLogs((prev) => {
      const next = [...prev]
      const ex = { ...next[exIdx] }
      ex.sets = ex.sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s))
      next[exIdx] = ex
      return next
    })
  }

  function clearProgress() {
    if (!confirm('Clear all logged sets for this workout?')) return
    setLogs((prev) => prev.map((log) => ({ ...log, sets: [] })))
  }

  // Build payload to submit
  const payload = logs.flatMap((ex) =>
    ex.sets.map((s, idx) => ({
      exerciseId: ex.exercise.id,
      exerciseName: ex.exercise.name,
      setNumber: idx + 1,
      weight: s.weight === '' ? null : parseFloat(s.weight),
      reps: s.reps === '' ? null : parseInt(s.reps),
      notes: s.notes || null,
    }))
  )

  const totalSetsLogged = payload.filter(
    (s) => s.weight !== null || s.reps !== null
  ).length
  const hasInProgress = totalSetsLogged > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/log" className="text-sm text-gray-400 hover:text-white">
          ← Cancel
        </Link>
        {hasInProgress && (
          <button
            type="button"
            onClick={clearProgress}
            className="text-xs text-gray-500 hover:text-red-400"
          >
            Clear progress
          </button>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold">{day.name}</h2>
        {hasInProgress && (
          <p className="mt-1 text-xs text-[#5B5BD6]">
            ✓ Auto-saved · {totalSetsLogged} set{totalSetsLogged === 1 ? '' : 's'} logged
          </p>
        )}
      </div>

      {logs.length === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-8 text-center text-sm text-gray-400">
          This day has no exercises yet. Add some on the Plan tab first.
        </div>
      )}

      <div className="space-y-3">
        {logs.map((log, exIdx) => {
          const lastStr = log.last
            ? log.last.sets
                .map((s) => `${s.weight ?? '–'}×${s.reps ?? '–'}`)
                .join(' · ')
            : null
          return (
            <div
              key={log.exercise.id}
              className="rounded-lg border border-gray-800 bg-gray-950 p-3"
            >
              <div className="mb-3">
                <p className="font-medium">{log.exercise.name}</p>
                <p className="text-xs text-gray-500">
                  Target: {log.exercise.target_sets} × {log.exercise.target_reps}
                </p>
                {lastStr && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Last ({fmtDate(log.last!.performed_at)}): {lastStr}
                  </p>
                )}
              </div>

              <div className="space-y-2 mb-2">
                {log.sets.map((s, setIdx) => (
                  <div
                    key={setIdx}
                    className="rounded-md border border-gray-800 bg-black p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-10 shrink-0">
                        Set {setIdx + 1}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Weight"
                        value={s.weight}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, 'weight', e.target.value)
                        }
                        className="w-full min-w-0 rounded border border-gray-700 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-gray-600"
                        aria-label={`Set ${setIdx + 1} weight`}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Reps"
                        value={s.reps}
                        onChange={(e) =>
                          updateSet(exIdx, setIdx, 'reps', e.target.value)
                        }
                        className="w-full min-w-0 rounded border border-gray-700 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-gray-600"
                        aria-label={`Set ${setIdx + 1} reps`}
                      />
                      <button
                        type="button"
                        onClick={() => removeSet(exIdx, setIdx)}
                        className="shrink-0 rounded p-2 text-gray-500 hover:text-red-400"
                        aria-label={`Remove set ${setIdx + 1}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="RPE / notes (optional)"
                      value={s.notes}
                      onChange={(e) =>
                        updateSet(exIdx, setIdx, 'notes', e.target.value)
                      }
                      className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-600"
                      aria-label={`Set ${setIdx + 1} notes`}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addSet(exIdx)}
                className="w-full rounded-md border border-gray-700 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-900"
              >
                + Add set
                {log.sets.length === 0 &&
                  log.last &&
                  log.last.sets.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {' '}
                      (pre-fills last time&apos;s numbers)
                    </span>
                  )}
              </button>
            </div>
          )
        })}
      </div>

      {logs.length > 0 && (
        <form action={finishSession} className="pt-2">
          <input type="hidden" name="dayId" value={day.id} />
          <input type="hidden" name="sets" value={JSON.stringify(payload)} />
          <button
            type="submit"
            disabled={totalSetsLogged === 0}
            className="w-full rounded-md bg-[#5B5BD6] px-4 py-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {totalSetsLogged === 0
              ? 'Log at least one set'
              : `Finish workout (${totalSetsLogged} sets)`}
          </button>
        </form>
      )}
    </div>
  )
}