'use client'

import { useState } from 'react'
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

  function addSet(exIdx: number) {
    setLogs((prev) => {
      const next = [...prev]
      const ex = { ...next[exIdx] }
      const prevSet = ex.sets[ex.sets.length - 1]
      ex.sets = [
        ...ex.sets,
        {
          weight: prevSet?.weight ?? '',
          reps: prevSet?.reps ?? '',
          notes: '',
        },
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

  function updateSet(exIdx: number, setIdx: number, field: keyof SetInput, value: string) {
    setLogs((prev) => {
      const next = [...prev]
      const ex = { ...next[exIdx] }
      ex.sets = ex.sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s))
      next[exIdx] = ex
      return next
    })
  }

  // Build payload to send
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

  const totalSetsLogged = payload.filter((s) => s.weight !== null || s.reps !== null).length

  return (
    <div className="space-y-4">
      <div>
        <Link href="/log" className="text-sm text-gray-400 hover:text-white">
          ← Cancel
        </Link>
      </div>

      <h2 className="text-2xl font-semibold">{day.name}</h2>

      {logs.length === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-8 text-center text-sm text-gray-400">
          This day has no exercises yet. Add some on the Plan tab first.
        </div>
      )}

      <div className="space-y-3">
        {logs.map((log, exIdx) => {
          const lastStr = log.last
            ? log.last.sets.map((s) => `${s.weight ?? '–'}×${s.reps ?? '–'}`).join(' · ')
            : null
          return (
            <div key={log.exercise.id} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="font-medium">{log.exercise.name}</p>
              <p className="text-xs text-gray-500 mb-1">
                Target: {log.exercise.target_sets} × {log.exercise.target_reps}
              </p>
              {lastStr ? (
                <p className="text-xs text-gray-500 mb-3">
                  Last ({fmtDate(log.last!.performed_at)}): {lastStr}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mb-3">No previous log yet.</p>
              )}

              {log.sets.length > 0 && (
                <div className="grid grid-cols-[16px_1fr_1fr_1fr_24px] gap-2 mb-1 text-[10px] uppercase tracking-wider text-gray-500">
                  <span></span>
                  <span>Weight</span>
                  <span>Reps</span>
                  <span>RPE/notes</span>
                  <span></span>
                </div>
              )}

              <div className="space-y-1.5 mb-2">
                {log.sets.map((s, setIdx) => (
                  <div
                    key={setIdx}
                    className="grid grid-cols-[16px_1fr_1fr_1fr_24px] gap-2 items-center"
                  >
                    <span className="text-xs text-gray-500 text-center">{setIdx + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="lbs"
                      value={s.weight}
                      onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                      className="rounded border border-gray-700 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-gray-600"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={s.reps}
                      onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                      className="rounded border border-gray-700 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-gray-600"
                    />
                    <input
                      type="text"
                      placeholder="—"
                      value={s.notes}
                      onChange={(e) => updateSet(exIdx, setIdx, 'notes', e.target.value)}
                      className="rounded border border-gray-700 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeSet(exIdx, setIdx)}
                      className="text-gray-500 hover:text-red-400 text-sm"
                      aria-label="Remove set"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addSet(exIdx)}
                className="w-full rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900"
              >
                + Add set
              </button>
            </div>
          )
        })}
      </div>

      {logs.length > 0 && (
        <form action={finishSession}>
          <input type="hidden" name="dayId" value={day.id} />
          <input type="hidden" name="sets" value={JSON.stringify(payload)} />
          <button
            type="submit"
            disabled={totalSetsLogged === 0}
            className="w-full rounded-md bg-[#5B5BD6] px-4 py-3 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {totalSetsLogged === 0 ? 'Log at least one set' : `Finish workout (${totalSetsLogged} sets)`}
          </button>
        </form>
      )}
    </div>
  )
}