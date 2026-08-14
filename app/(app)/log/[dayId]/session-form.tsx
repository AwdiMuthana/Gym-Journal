'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { finishSession, lookupLastByName } from '@/app/log-actions'
import type { DayWithExercises, Exercise } from '@/lib/types'

const REST_SECONDS = 120
const EXTEND_SECONDS = 30

// Hardcoded for now — bar weight and plate sizes aren't user-configurable yet.
const BAR_WEIGHT = 45
const PLATE_DENOMINATIONS = [45, 35, 25, 10, 5, 2.5]

function BarbellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="6" y1="7" x2="6" y2="17" />
      <line x1="9" y1="9" x2="9" y2="15" />
      <line x1="15" y1="9" x2="15" y2="15" />
      <line x1="18" y1="7" x2="18" y2="17" />
    </svg>
  )
}

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
  skipped: number
  done: boolean
  plateBarOn: boolean
  plateDouble: boolean
}

type SavedSlot = {
  key: string
  source: SlotSource
  exerciseId: string | null
  name: string
  targetSets: number | null
  targetReps: string | null
  sets: SetInput[]
  skipped: number
  done: boolean
  plateBarOn: boolean
  plateDouble: boolean
}

type SavedState = {
  slots: SavedSlot[]
  startedAt: number
  activeKey: string | null
  restUntil: number | null
}

const storageKey = (dayId: string) => `gym-journal:session:${dayId}`

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function fmtClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function computePrefill(slot: ExerciseSlot): { weight: string; reps: string } {
  const prevSet = slot.sets[slot.sets.length - 1]
  if (prevSet) return { weight: prevSet.weight, reps: prevSet.reps }
  if (slot.last && slot.last.sets.length > 0) {
    const firstLast = slot.last.sets[0]
    return {
      weight: firstLast.weight !== null ? String(firstLast.weight) : '',
      reps: firstLast.reps !== null ? String(firstLast.reps) : '',
    }
  }
  return { weight: '', reps: '' }
}

// Shrinks the stepper numeral as the value gets longer so it never gets cropped.
function stepperSizeClass(value: string): string {
  const len = value.length
  if (len <= 3) return 'text-3xl'
  if (len === 4) return 'text-2xl'
  if (len === 5) return 'text-xl'
  return 'text-lg'
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
      skipped: 0,
      done: false,
      plateBarOn: true,
      plateDouble: true,
    }))
  )
  const [restored, setRestored] = useState(false)
  const [startedAt, setStartedAt] = useState<number>(() => Date.now())

  const [activeKey, setActiveKey] = useState<string | null>(() => exercisesWithLast[0]?.exercise.id ?? null)
  const [mode, setMode] = useState<'focus' | 'resting'>('focus')
  const [restUntil, setRestUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const [weightInput, setWeightInput] = useState('')
  const [repsInput, setRepsInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)

  const [plateOpen, setPlateOpen] = useState(false)
  const [plateCounts, setPlateCounts] = useState<Record<number, number>>({})

  const [editingSet, setEditingSet] = useState<{ slotKey: string; setIdx: number } | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editReps, setEditReps] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [overviewOpen, setOverviewOpen] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [swapKey, setSwapKey] = useState<string | null>(null)
  const [swapName, setSwapName] = useState('')
  const [swapBusy, setSwapBusy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rawActiveIdx = slots.findIndex((s) => s.key === activeKey)
  const activeSlotIdx = rawActiveIdx !== -1 ? rawActiveIdx : 0
  const activeSlot = slots.length > 0 ? slots[activeSlotIdx] : null

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
            return match
              ? {
                  ...slot,
                  sets: match.sets,
                  skipped: match.skipped ?? 0,
                  done: match.done ?? false,
                  plateBarOn: match.plateBarOn ?? true,
                  plateDouble: match.plateDouble ?? true,
                }
              : slot
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
              skipped: s.skipped ?? 0,
              done: s.done ?? false,
              plateBarOn: s.plateBarOn ?? true,
              plateDouble: s.plateDouble ?? true,
            }))
          return [...plannedRestored, ...adhocRestored]
        })
        if (typeof parsed.startedAt === 'number') setStartedAt(parsed.startedAt)
        if (parsed.activeKey) setActiveKey(parsed.activeKey)
        if (parsed.restUntil && parsed.restUntil > Date.now()) {
          setNow(Date.now())
          setRestUntil(parsed.restUntil)
          setMode('resting')
        }
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
      const hasProgress = slots.some(
        (s) => s.sets.length > 0 || s.skipped > 0 || s.done || s.source === 'adhoc'
      )
      if (hasProgress) {
        const toSave: SavedState = {
          slots: slots
            .filter((s) => s.sets.length > 0 || s.skipped > 0 || s.done || s.source === 'adhoc')
            .map((s) => ({
              key: s.key,
              source: s.source,
              exerciseId: s.exerciseId,
              name: s.name,
              targetSets: s.targetSets,
              targetReps: s.targetReps,
              sets: s.sets,
              skipped: s.skipped,
              done: s.done,
              plateBarOn: s.plateBarOn,
              plateDouble: s.plateDouble,
            })),
          startedAt,
          activeKey,
          restUntil: mode === 'resting' ? restUntil : null,
        }
        localStorage.setItem(storageKey(day.id), JSON.stringify(toSave))
      } else {
        localStorage.removeItem(storageKey(day.id))
      }
    } catch {
      // ignore save errors
    }
  }, [slots, day.id, restored, startedAt, activeKey, mode, restUntil])

  // Re-seed the weight/rep inputs whenever the active slot (or its progress) changes
  useEffect(() => {
    if (!activeSlot) return
    const prefill = computePrefill(activeSlot)
    setWeightInput(prefill.weight)
    setRepsInput(prefill.reps)
    setNotesInput('')
    setNotesOpen(false)
    setPlateCounts({})
    setPlateOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlotIdx, activeSlot?.name, activeSlot?.sets.length, activeSlot?.skipped])

  // Tick the rest countdown
  useEffect(() => {
    if (mode !== 'resting') return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [mode])

  function bumpWeight(delta: number) {
    const cur = parseFloat(weightInput) || 0
    setWeightInput(String(Math.max(0, cur + delta)))
  }

  function bumpReps(delta: number) {
    const cur = parseInt(repsInput) || 0
    setRepsInput(String(Math.max(0, cur + delta)))
  }

  function plateTotal(counts: Record<number, number>, barOn: boolean, doubleSided: boolean) {
    const perSide = PLATE_DENOMINATIONS.reduce((sum, denom) => sum + denom * (counts[denom] ?? 0), 0)
    const barWeight = barOn ? BAR_WEIGHT : 0
    return barWeight + perSide * (doubleSided ? 2 : 1)
  }

  function addPlate(denom: number) {
    if (!activeSlot) return
    const { plateBarOn, plateDouble } = activeSlot
    setPlateCounts((prev) => {
      const next = { ...prev, [denom]: (prev[denom] ?? 0) + 1 }
      setWeightInput(String(plateTotal(next, plateBarOn, plateDouble)))
      return next
    })
  }

  function removePlate(denom: number) {
    if (!activeSlot) return
    const { plateBarOn, plateDouble } = activeSlot
    setPlateCounts((prev) => {
      const current = prev[denom] ?? 0
      if (current <= 0) return prev
      const next = { ...prev, [denom]: current - 1 }
      setWeightInput(String(plateTotal(next, plateBarOn, plateDouble)))
      return next
    })
  }

  function resetPlates() {
    setPlateCounts({})
  }

  function toggleSlotPlateBar() {
    if (!activeSlot) return
    const nextBarOn = !activeSlot.plateBarOn
    const updatedSlot = { ...activeSlot, plateBarOn: nextBarOn }
    setSlots(slots.map((s, i) => (i === activeSlotIdx ? updatedSlot : s)))
    setWeightInput(String(plateTotal(plateCounts, nextBarOn, activeSlot.plateDouble)))
  }

  function toggleSlotPlateDouble() {
    if (!activeSlot) return
    const nextDouble = !activeSlot.plateDouble
    const updatedSlot = { ...activeSlot, plateDouble: nextDouble }
    setSlots(slots.map((s, i) => (i === activeSlotIdx ? updatedSlot : s)))
    setWeightInput(String(plateTotal(plateCounts, activeSlot.plateBarOn, nextDouble)))
  }

  function startEditSet(slotKey: string, setIdx: number) {
    const slot = slots.find((s) => s.key === slotKey)
    const set = slot?.sets[setIdx]
    if (!set) return
    setEditingSet({ slotKey, setIdx })
    setEditWeight(set.weight)
    setEditReps(set.reps)
    setEditNotes(set.notes)
  }

  function cancelEditSet() {
    setEditingSet(null)
  }

  function saveEditSet() {
    if (!editingSet) return
    setSlots((prev) =>
      prev.map((s) =>
        s.key === editingSet.slotKey
          ? {
              ...s,
              sets: s.sets.map((set, i) =>
                i === editingSet.setIdx ? { weight: editWeight, reps: editReps, notes: editNotes } : set
              ),
            }
          : s
      )
    )
    setEditingSet(null)
  }

  function startRest() {
    const startedNow = Date.now()
    setNow(startedNow)
    setRestUntil(startedNow + REST_SECONDS * 1000)
    setMode('resting')
  }

  function endRest() {
    setMode('focus')
    setRestUntil(null)
  }

  function jumpTo(key: string) {
    setActiveKey(key)
    setMode('focus')
    setRestUntil(null)
    setOverviewOpen(false)
  }

  function nextExercise() {
    if (slots.length < 2) return
    const nextIdx = (activeSlotIdx + 1) % slots.length
    jumpTo(slots[nextIdx].key)
  }

  function applySlotUpdate(updatedSlot: ExerciseSlot, advanceIfDone: boolean) {
    const nextSlots = slots.map((s, i) => (i === activeSlotIdx ? updatedSlot : s))
    setSlots(nextSlots)
    if (advanceIfDone && updatedSlot.done && nextSlots.length > 1) {
      const nextIdx = (activeSlotIdx + 1) % nextSlots.length
      setActiveKey(nextSlots[nextIdx].key)
    }
  }

  function logSet() {
    if (!activeSlot) return
    const updatedSlot: ExerciseSlot = {
      ...activeSlot,
      sets: [...activeSlot.sets, { weight: weightInput, reps: repsInput, notes: notesInput }],
    }
    if (updatedSlot.targetSets !== null && updatedSlot.sets.length + updatedSlot.skipped >= updatedSlot.targetSets) {
      updatedSlot.done = true
    }
    applySlotUpdate(updatedSlot, true)
    startRest()
  }

  function skipSet() {
    if (!activeSlot) return
    const updatedSlot: ExerciseSlot = { ...activeSlot, skipped: activeSlot.skipped + 1 }
    if (updatedSlot.targetSets !== null && updatedSlot.sets.length + updatedSlot.skipped >= updatedSlot.targetSets) {
      updatedSlot.done = true
    }
    applySlotUpdate(updatedSlot, true)
  }

  function removeSlot(slotIdx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== slotIdx))
  }

  function clearProgress() {
    if (!confirm('Clear all logged sets for this workout?')) return
    setSlots((prev) =>
      prev.filter((s) => s.source === 'planned').map((s) => ({ ...s, sets: [], skipped: 0, done: false }))
    )
    setMode('focus')
    setRestUntil(null)
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
      {
        key: uid(),
        source: 'adhoc',
        exerciseId: null,
        name,
        targetSets: null,
        targetReps: null,
        last,
        sets: [],
        skipped: 0,
        done: false,
        plateBarOn: true,
        plateDouble: true,
      },
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
        skipped: 0,
        done: false,
        plateBarOn: true,
        plateDouble: true,
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
  const remainingSec = restUntil ? Math.ceil(Math.max(0, restUntil - now) / 1000) : 0

  const inputBaseClasses =
    'w-full min-w-0 flex-1 border-0 bg-transparent text-center font-black tabular-nums tracking-tight text-bg focus-visible:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

  function renderSlotSets(slot: ExerciseSlot) {
    if (slot.sets.length === 0) return null
    return (
      <div className="divide-y-2 divide-neutral-800 border-2 border-neutral-700">
        {slot.sets.map((set, idx) => {
          const isEditing = editingSet?.slotKey === slot.key && editingSet.setIdx === idx
          return (
            <div key={idx} className="p-3">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      placeholder="Weight"
                      autoFocus
                      className="w-full border-2 border-neutral-700 bg-transparent px-2 py-1.5 text-center text-sm font-bold tabular-nums text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editReps}
                      onChange={(e) => setEditReps(e.target.value)}
                      placeholder="Reps"
                      className="w-full border-2 border-neutral-700 bg-transparent px-2 py-1.5 text-center text-sm font-bold tabular-nums text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="RPE / notes"
                    className="w-full border-2 border-neutral-700 bg-transparent px-3 py-1.5 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEditSet}
                      className="flex-1 bg-accent px-3 py-1.5 text-xs font-black uppercase tracking-wide text-bg"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditSet}
                      className="flex-1 border-2 border-neutral-700 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-bg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tabular-nums text-bg">
                      Set {String(idx + 1).padStart(2, '0')} · {set.weight || '–'} × {set.reps || '–'}
                    </p>
                    {set.notes && <p className="truncate text-[11px] text-neutral-500">{set.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditSet(slot.key, idx)}
                    className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <form action={finishSession} onSubmit={() => setIsSubmitting(true)} className="space-y-4">
      <input type="hidden" name="dayId" value={day.id} />
      <input type="hidden" name="sets" value={JSON.stringify(payload)} />
      <input type="hidden" name="startedAt" value={String(startedAt)} />

      <div className="flex items-center justify-between">
        <Link href="/log" className="text-sm font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent">
          ← Cancel
        </Link>
        {hasInProgress && (
          <button type="button" onClick={clearProgress} className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent">
            Clear progress
          </button>
        )}
      </div>

      <div>
        <h2 className="text-3xl font-black uppercase tracking-tight">{day.name}</h2>
        {hasInProgress && (
          <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-accent">
            ✓ Auto-saved · {totalSetsLogged} set{totalSetsLogged === 1 ? '' : 's'} logged
          </p>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="space-y-3">
          <div className="border-2 border-neutral-700 py-8 text-center text-sm text-neutral-400">
            This day has no exercises yet. Add one below, or add exercises on the Plan tab.
          </div>
          {addOpen ? (
            <div className="space-y-2 border-2 border-neutral-700 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                Add an exercise for this workout only
              </p>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Exercise name (e.g. Incline DB Press)"
                autoFocus
                className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={addBusy || !addName.trim()}
                  onClick={confirmAdd}
                  className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg disabled:opacity-40"
                >
                  {addBusy ? 'Adding…' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false)
                    setAddName('')
                  }}
                  className="flex-1 border-2 border-neutral-700 px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-bg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full border-2 border-dashed border-neutral-700 px-3 py-2.5 text-sm font-extrabold uppercase tracking-wide text-neutral-400 hover:border-accent hover:text-accent"
            >
              + Add exercise
            </button>
          )}
        </div>
      ) : mode === 'resting' ? (
        <div className="space-y-4 border-2 border-accent bg-accent p-6 text-center text-bg">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">Resting</p>
          <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">
            {activeSlot
              ? activeSlot.sets.length + activeSlot.skipped > 0
                ? `Set ${String(activeSlot.sets.length + activeSlot.skipped + 1).padStart(2, '0')} · ${activeSlot.name}`
                : activeSlot.name
              : ''}
          </p>
          <p className="py-4 text-7xl font-black tabular-nums tracking-tight">{fmtClock(remainingSec)}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRestUntil((prev) => (prev ?? Date.now()) + EXTEND_SECONDS * 1000)}
              className="border-2 border-bg px-4 py-3 text-sm font-black uppercase tracking-wide"
            >
              +30 sec
            </button>
            <button type="button" onClick={endRest} className="bg-ink px-4 py-3 text-sm font-black uppercase tracking-wide text-bg">
              {remainingSec > 0 ? 'Skip rest →' : 'Continue →'}
            </button>
          </div>
        </div>
      ) : activeSlot ? (
        <div className="space-y-4 border-2 border-neutral-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
              Exercise {activeSlotIdx + 1}/{slots.length}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSwapKey(activeSlot.key)
                  setSwapName('')
                  setOverviewOpen(true)
                }}
                className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
              >
                Swap
              </button>
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={nextExercise}
                  className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                >
                  Next exercise →
                </button>
              )}
            </div>
          </div>

          {activeSlot.targetSets !== null && (
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${activeSlot.targetSets}, 1fr)` }}>
              {Array.from({ length: activeSlot.targetSets }).map((_, i) => (
                <i
                  key={i}
                  className={`h-1.5 ${i < activeSlot.sets.length + activeSlot.skipped ? 'bg-accent' : 'bg-neutral-800'}`}
                />
              ))}
            </div>
          )}

          <div>
            <p className="text-3xl font-black uppercase tracking-tight">{activeSlot.name}</p>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
              {activeSlot.targetSets !== null
                ? `Set ${String(activeSlot.sets.length + activeSlot.skipped + 1).padStart(2, '0')} of ${String(activeSlot.targetSets).padStart(2, '0')}`
                : `Set ${activeSlot.sets.length + activeSlot.skipped + 1}`}
              {activeSlot.last &&
                ` · last time ${activeSlot.last.sets.map((s) => `${s.weight ?? '–'}×${s.reps ?? '–'}`).join(' · ')}`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y-2 border-neutral-700 py-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">Weight</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bumpWeight(-5)}
                  className="h-12 w-12 shrink-0 border-2 border-neutral-700 text-2xl font-black text-bg"
                  aria-label="Decrease weight"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className={`${inputBaseClasses} ${stepperSizeClass(weightInput)}`}
                  aria-label="Weight"
                />
                <button
                  type="button"
                  onClick={() => bumpWeight(5)}
                  className="h-12 w-12 shrink-0 bg-accent text-2xl font-black text-bg"
                  aria-label="Increase weight"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">Reps</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bumpReps(-1)}
                  className="h-12 w-12 shrink-0 border-2 border-neutral-700 text-2xl font-black text-bg"
                  aria-label="Decrease reps"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={repsInput}
                  onChange={(e) => setRepsInput(e.target.value)}
                  className={`${inputBaseClasses} ${stepperSizeClass(repsInput)}`}
                  aria-label="Reps"
                />
                <button
                  type="button"
                  onClick={() => bumpReps(1)}
                  className="h-12 w-12 shrink-0 bg-accent text-2xl font-black text-bg"
                  aria-label="Increase reps"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPlateOpen((v) => !v)}
            className={`flex w-full items-center justify-between gap-2 border-2 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide ${
              plateOpen ? 'border-accent text-accent' : 'border-neutral-700 text-bg'
            }`}
          >
            <span className="flex items-center gap-2">
              <BarbellIcon className="h-4 w-4 shrink-0" />
              Plate calculator
            </span>
            <span className="text-neutral-500">{plateOpen ? 'Hide ▴' : 'Open ▾'}</span>
          </button>

          {plateOpen && (
            <div className="space-y-3 border-2 border-t-0 border-neutral-700 p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleSlotPlateBar}
                  className={`border-2 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide ${
                    activeSlot.plateBarOn ? 'border-accent text-accent' : 'border-neutral-700 text-neutral-500'
                  }`}
                >
                  Bar {activeSlot.plateBarOn ? `on · ${BAR_WEIGHT} lb` : 'off'}
                </button>
                <button
                  type="button"
                  onClick={toggleSlotPlateDouble}
                  className={`border-2 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide ${
                    activeSlot.plateDouble ? 'border-accent text-accent' : 'border-neutral-700 text-neutral-500'
                  }`}
                >
                  {activeSlot.plateDouble ? 'Double sided' : 'Single sided'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                  Plates per side
                </p>
                <button
                  type="button"
                  onClick={resetPlates}
                  className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLATE_DENOMINATIONS.map((denom) => {
                  const count = plateCounts[denom] ?? 0
                  return (
                    <div
                      key={denom}
                      className={`flex flex-col items-center gap-1.5 border-2 py-2 ${
                        count > 0 ? 'border-accent' : 'border-neutral-700'
                      }`}
                    >
                      <span className="text-lg font-black tabular-nums text-bg">{denom}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => removePlate(denom)}
                          disabled={count === 0}
                          className="h-7 w-7 shrink-0 border-2 border-neutral-700 text-sm font-black text-bg disabled:opacity-30"
                          aria-label={`Remove ${denom} lb plate`}
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm font-black tabular-nums text-bg">{count}</span>
                        <button
                          type="button"
                          onClick={() => addPlate(denom)}
                          className="h-7 w-7 shrink-0 bg-accent text-sm font-black text-bg"
                          aria-label={`Add ${denom} lb plate`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-center text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                {activeSlot.plateBarOn ? `${BAR_WEIGHT} bar` : 'No bar'} +{' '}
                {PLATE_DENOMINATIONS.reduce((sum, d) => sum + d * (plateCounts[d] ?? 0), 0)} ×{' '}
                {activeSlot.plateDouble ? 2 : 1} = {plateTotal(plateCounts, activeSlot.plateBarOn, activeSlot.plateDouble)} lb
              </p>
            </div>
          )}

          {notesOpen && (
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="RPE / notes"
              autoFocus
              className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
            />
          )}

          {activeSlot.sets.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                Logged this exercise
              </p>
              {renderSlotSets(activeSlot)}
            </div>
          )}

          <button
            type="button"
            onClick={logSet}
            className="w-full bg-accent px-4 py-4 text-lg font-black uppercase tracking-wide text-bg"
          >
            Log set · rest {fmtClock(REST_SECONDS)}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              className="border-2 border-neutral-700 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-bg"
            >
              {notesOpen ? 'Hide note' : 'Note / RPE'}
            </button>
            <button
              type="button"
              onClick={skipSet}
              className="border-2 border-neutral-700 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-bg"
            >
              Skip set
            </button>
          </div>
        </div>
      ) : null}

      {hasInProgress && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border-2 border-accent px-4 py-3 text-sm font-black uppercase tracking-wide text-accent hover:bg-accent hover:text-bg disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? 'Saving…' : `Finish workout (${totalSetsLogged} set${totalSetsLogged === 1 ? '' : 's'})`}
        </button>
      )}

      {slots.length > 0 && (
        <div className="border-2 border-neutral-700">
          <button
            type="button"
            onClick={() => setOverviewOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">All exercises</span>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {slots.map((s) => (
                  <i key={s.key} className={`h-2 w-2 ${s.done ? 'bg-accent' : 'bg-neutral-700'}`} />
                ))}
              </div>
              <span className="text-neutral-500">{overviewOpen ? '▴' : '▾'}</span>
            </div>
          </button>

          {overviewOpen && (
            <div className="divide-y-2 divide-neutral-800 border-t-2 border-neutral-700">
              {slots.map((s, idx) => {
                const isSwapping = swapKey === s.key
                return (
                  <div key={s.key} className="p-3">
                    {isSwapping ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                          Swap for a different exercise
                        </p>
                        <input
                          type="text"
                          value={swapName}
                          onChange={(e) => setSwapName(e.target.value)}
                          placeholder="Exercise name"
                          autoFocus
                          className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={swapBusy || !swapName.trim()}
                            onClick={() => confirmSwap(idx)}
                            className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg disabled:opacity-40"
                          >
                            {swapBusy ? 'Swapping…' : 'Swap'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSwapKey(null)
                              setSwapName('')
                            }}
                            className="flex-1 border-2 border-neutral-700 px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-bg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => jumpTo(s.key)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className={`font-bold uppercase tracking-tight ${idx === activeSlotIdx ? 'text-accent' : ''}`}>
                              {s.name}
                            </p>
                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
                              {s.done
                                ? '✓ Done'
                                : s.targetSets !== null
                                ? `${s.sets.length + s.skipped} of ${s.targetSets} logged`
                                : 'Not in your plan'}
                            </p>
                          </button>
                          <div className="flex shrink-0 items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSwapKey(s.key)
                                setSwapName('')
                              }}
                              className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                            >
                              Swap
                            </button>
                            {s.source === 'adhoc' && (
                              <button
                                type="button"
                                onClick={() => removeSlot(idx)}
                                className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        {idx !== activeSlotIdx && s.sets.length > 0 && (
                          <div className="mt-2">{renderSlotSets(s)}</div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
              <div className="p-3">
                {addOpen ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                      Add an exercise for this workout only
                    </p>
                    <input
                      type="text"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="Exercise name (e.g. Incline DB Press)"
                      autoFocus
                      className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={addBusy || !addName.trim()}
                        onClick={confirmAdd}
                        className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg disabled:opacity-40"
                      >
                        {addBusy ? 'Adding…' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddOpen(false)
                          setAddName('')
                        }}
                        className="flex-1 border-2 border-neutral-700 px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-bg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="w-full border-2 border-dashed border-neutral-700 px-3 py-2.5 text-sm font-extrabold uppercase tracking-wide text-neutral-400 hover:border-accent hover:text-accent"
                  >
                    + Add exercise not in this plan
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
