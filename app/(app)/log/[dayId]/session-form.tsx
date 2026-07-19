'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { finishSession, lookupLastByName } from '@/app/log-actions'
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

type SlotSource = 'planned' | 'adhoc'

type ExerciseSlot = {
  key: string
  source: SlotSource
  exerciseId: string | null
  name: string
  targetSets: number | null
  targetReps: string | null
  last: LastSets
  sets: SetInput[]
}

type SavedSlot = {
  key: string
  source: SlotSource
  exerciseId: string | null
  name: string
  targetSets: number | null
  targetReps: string | null
  sets: SetInput[]
}

type SavedState = {
  slots: SavedSlot[]
}

const storageKey = (dayId: string) => `gym-journal:session:${dayId}`

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
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
  const [slots, setSlots] = useState<ExerciseSlot[]>(() =>
    exercisesWithLast.map(({ exercise, last }) => ({
      key: exercise.id,
      source: 'planned',
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: exercise.target_sets,
      targetReps: exercise.target_reps,
      last,
      sets: [],
    }))
  )
  const [restored, setRestored] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [swapKey, setSwapKey] = useState<string | null>(null)
  const [swapName, setSwapName] = useState('')
  const [swapBusy, setSwapBusy] = useState(false)

  // Restore in-progress workout from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(day.id))
      if (saved) {
        const parsed: SavedState = JSON.parse(saved)
        setSlots((prev) => {
          const plannedRestored = prev.map((slot) => {
            const match = parsed.slots.find(
              (s) => s.source === 'planned' && s.exerciseId === slot.exerciseId
            )
            return match ? { ...slot, sets: match.sets } : slot
          })
          const adhocRestored: ExerciseSlot[] = parsed.slots
            .filter((s) => s.source === 'adhoc')
            .map((s) => ({
              key: s.key,
              source: 'adhoc',
              exerciseId: null,
              name: s.name,
              targetSets: null,
              targetReps: null,
              last: null,
              sets: s.sets,
            }))
          return [...plannedRestored, ...adhocRestored]
        })
      }
    } catch {
      // ignore restore errors
    }
    setRestored(true)
  }, [day.id])

  // Auto-save to localStorage
  useEffect(() => {
    if (!restored) return
    try {
      const hasProgress = slots.some((s) => s.sets.length > 0 || s.source === 'adhoc')
      if (hasProgress) {
        const toSave: SavedState = {
          slots: slots
            .filter((s) => s.sets.length > 0 || s.source === 'adhoc')
            .map((s) => ({
              key: s.key,
              source: s.source,
              exerciseId: s.exerciseId,
              name: s.name,
              targetSets: s.targetSets,
              targetReps: s.targetReps,
              sets: s.sets,
            })),
        }
        localStorage.setItem(storageKey(day.id), JSON.stringify(toSave))
      } else {
        localStorage.removeItem(storageKey(day.id))
      }
    } catch {
      // ignore save errors
    }
  }, [slots, day.id, restored])

  function addSet(slotIdx: number) {
    setSlots((prev) => {
      const next = [...prev]
      const slot = { ...next[slotIdx] }
      const prevSet = slot.sets[slot.sets.length - 1]

      let prefillWeight = ''
      let prefillReps = ''
      if (prevSet) {
        prefillWeight = prevSet.weight
        prefillReps = prevSet.reps
      } else if (slot.last && slot.last.sets.length > 0) {
        const firstLast = slot.last.sets[0]
        prefillWeight = firstLast.weight !== null ? String(firstLast.weight) : ''
        prefillReps = firstLast.reps !== null ? String(firstLast.reps) : ''
      }

      slot.sets = [...slot.sets, { weight: prefillWeight, reps: prefillReps, notes: '' }]
      next[slotIdx] = slot
      return next
    })
  }

  function removeSet(slotIdx: number, setIdx: number) {
    setSlots((prev) => {
      const next = [...prev]
      const slot = { ...next[slotIdx] }
      slot.sets = slot.sets.filter((_, i) => i !== setIdx)
      next[slotIdx] = slot
      return next
    })
  }

  function updateSet(slotIdx: number, setIdx: number, field: keyof SetInput, value: string) {
    setSlots((prev) => {
      const next = [...prev]
      const slot = { ...next[slotIdx] }
      slot.sets = slot.sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s))
      next[slotIdx] = slot
      return next
    })
  }

  function removeSlot(slotIdx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== slotIdx))
  }

  function clearProgress() {
    if (!confirm('Clear all logged sets for this workout?')) return
    setSlots((prev) => prev.filter((s) => s.source === 'planned').map((s) => ({ ...s, sets: [] })))
  }

  async function confirmAdd() {
    const name = addName.trim()
    if (!name) return
    setAddBusy(true)
    let last: LastSets = null
    try {
      last = await lookupLastByName(name)
    } catch {
      // non-fatal — just show no history
    }
    setSlots((prev) => [
      ...prev,
      { key: uid(), source: 'adhoc', exerciseId: null, name, targetSets: null, targetReps: null, last, sets: [] },
    ])
    setAddBusy(false)
    setAddOpen(false)
    setAddName('')
  }

  async function confirmSwap(slotIdx: number) {
    const name = swapName.trim()
    if (!name) return
    const slot = slots[slotIdx]
    if (slot.sets.length > 0) {
      const ok = confirm(
        `Swapping will clear the ${slot.sets.length} set${slot.sets.length === 1 ? '' : 's'} already logged here. Continue?`
      )
      if (!ok) return
    }
    setSwapBusy(true)
    let last: LastSets = null
    try {
      last = await lookupLastByName(name)
    } catch {
      // non-fatal
    }
    setSlots((prev) => {
      const next = [...prev]
      next[slotIdx] = {
        key: next[slotIdx].key,
        source: 'adhoc',
        exerciseId: null,
        name,
        targetSets: null,
        targetReps: null,
        last,
        sets: [],
      }
      return next
    })
    setSwapBusy(false)
    setSwapKey(null)
    setSwapName('')
  }

  const payload = slots.flatMap((slot) =>
    slot.sets.map((s, idx) => ({
      exerciseId: slot.exerciseId,
      exerciseName: slot.name,
      setNumber: idx + 1,
      weight: s.weight === '' ? null : parseFloat(s.weight),
      reps: s.reps === '' ? null : parseInt(s.reps),
      notes: s.notes || null,
    }))
  )

  const totalSetsLogged = payload.filter((s) => s.weight !== null || s.reps !== null).length
  const hasInProgress = totalSetsLogged > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/log" className="text-sm text-gray-400 hover:text-white">
          ← Cancel
        </Link>
        {hasInProgress && (
          <button type="button" onClick={clearProgress} className="text-xs text-gray-500 hover:text-red-400">
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

      {slots.length === 0 && !addOpen && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-8 text-center text-sm text-gray-400">
          This day has no exercises yet. Add one below, or add exercises on the Plan tab.
        </div>
      )}

      <div className="space-y-3">
        {slots.map((slot, slotIdx) => {
          const lastStr = slot.last
            ? slot.last.sets.map((s) => `${s.weight ?? '–'}×${s.reps ?? '–'}`).join(' · ')
            : null
          const isSwapping = swapKey === slot.key

          return (
            <div key={slot.key} className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              {isSwapping ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Swap for a different exercise
                  </p>
                  <input
                    type="text"
                    value={swapName}
                    onChange={(e) => setSwapName(e.target.value)}
                    placeholder="Exercise name"
                    autoFocus
                    className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={swapBusy || !swapName.trim()}
                      onClick={() => confirmSwap(slotIdx)}
                      className="flex-1 rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {swapBusy ? 'Swapping…' : 'Swap'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSwapKey(null)
                        setSwapName('')
                      }}
                      className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{slot.name}</p>
                      {slot.source === 'planned' ? (
                        <p className="text-xs text-gray-500">
                          Target: {slot.targetSets} × {slot.targetReps}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">Not in your plan</p>
                      )}
                      {lastStr ? (
                        <p className="mt-0.5 text-xs text-gray-500">
                          Last ({fmtDate(slot.last!.performed_at)}): {lastStr}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-gray-500">No previous log yet.</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSwapKey(slot.key)
                          setSwapName('')
                        }}
                        className="text-xs text-gray-500 hover:text-white"
                      >
                        Swap
                      </button>
                      {slot.source === 'adhoc' && (
                        <button
                          type="button"
                          onClick={() => removeSlot(slotIdx)}
                          className="text-xs text-gray-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mb-2 space-y-2">
                    {slot.sets.map((s, setIdx) => (
                      <div key={setIdx} className="space-y-2 rounded-md border border-gray-800 bg-black p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-10 shrink-0 text-xs font-medium text-gray-500">
                            Set {setIdx + 1}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Weight"
                            value={s.weight}
                            onChange={(e) => updateSet(slotIdx, setIdx, 'weight', e.target.value)}
                            className="w-full min-w-0 rounded border border-gray-700 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-gray-600"
                            aria-label={`Set ${setIdx + 1} weight`}
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Reps"
                            value={s.reps}
                            onChange={(e) => updateSet(slotIdx, setIdx, 'reps', e.target.value)}
                            className="w-full min-w-0 rounded border border-gray-700 bg-transparent px-3 py-2.5 text-base text-white placeholder:text-gray-600"
                            aria-label={`Set ${setIdx + 1} reps`}
                          />
                          <button
                            type="button"
                            onClick={() => removeSet(slotIdx, setIdx)}
                            className="shrink-0 rounded p-2 text-gray-500 hover:text-red-400"
                            aria-label={`Remove set ${setIdx + 1}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="RPE / notes (optional)"
                          value={s.notes}
                          onChange={(e) => updateSet(slotIdx, setIdx, 'notes', e.target.value)}
                          className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-600"
                          aria-label={`Set ${setIdx + 1} notes`}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSet(slotIdx)}
                    className="w-full rounded-md border border-gray-700 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-900"
                  >
                    + Add set
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {addOpen ? (
        <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Add an exercise for this workout only
          </p>
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Exercise name (e.g. Incline DB Press)"
            autoFocus
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
          <p className="text-xs text-gray-500">
            This won&apos;t be added to your plan — just logged for today.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={addBusy || !addName.trim()}
              onClick={confirmAdd}
              className="flex-1 rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {addBusy ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAddOpen(false)
                setAddName('')
              }}
              className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full rounded-md border border-dashed border-gray-700 px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-900"
        >
          + Add exercise not in this plan
        </button>
      )}

      {slots.length > 0 && (
        <form action={finishSession} className="pt-2">
          <input type="hidden" name="dayId" value={day.id} />
          <input type="hidden" name="sets" value={JSON.stringify(payload)} />
          <button
            type="submit"
            disabled={totalSetsLogged === 0}
            className="w-full rounded-md bg-[#5B5BD6] px-4 py-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {totalSetsLogged === 0 ? 'Log at least one set' : `Finish workout (${totalSetsLogged} sets)`}
          </button>
        </form>
      )}
    </div>
  )
}