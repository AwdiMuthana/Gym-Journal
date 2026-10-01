'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { finishSession, lookupLastByName } from '@/app/log-actions'
import type { DayWithExercises, Exercise } from '@/lib/types'
import {
  BAR_WEIGHT_KG,
  BAR_WEIGHT_LB,
  PLATE_DENOMINATIONS_KG,
  PLATE_DENOMINATIONS_LB,
  UNITS_STORAGE_KEY,
  WEIGHT_BUMP_KG,
  WEIGHT_BUMP_LB,
  displayToLbs,
  formatVolume,
  formatWeight,
  readStoredUnits,
  unitLabel,
  type UnitSystem,
} from '@/lib/units'
import ExerciseNamePicker from '../../exercise-name-picker'

const REST_SECONDS = 120
const EXTEND_SECONDS = 30
const HOLD_DELAY_MS = 400
const HOLD_REPEAT_MS = 120

type LastSets = {
  performed_at: string
  sets: { weight: number | null; reps: number | null; notes: string | null }[]
} | null

type SetInput = {
  // weight is always stored here in lb (canonical), regardless of display unit.
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
  restTotal?: number
  restFor?: RestFor | null
}

// What the rest screen is resting from: the exercise and set just logged.
type RestFor = { slotKey: string; name: string; setNumber: number }

const storageKey = (dayId: string) => `gym-journal:session:${dayId}`

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const pad = (n: number) => String(n).padStart(2, '0')

function fmtClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${pad(s)}`
}

function fmtElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// Converts a lb-string (as stored in SetInput.weight) to a display string.
function displayFromStored(lbsStr: string, unit: UnitSystem): string {
  if (lbsStr === '') return ''
  const n = parseFloat(lbsStr)
  if (Number.isNaN(n)) return ''
  return formatWeight(n, unit)
}

// Converts whatever the user typed/sees (display unit) to a lb-string for storage.
function toLbsString(display: string, unit: UnitSystem): string {
  const trimmed = display.trim()
  if (trimmed === '') return ''
  const n = parseFloat(trimmed)
  if (Number.isNaN(n)) return ''
  const lbs = displayToLbs(n, unit)
  return String(Math.round(lbs * 100) / 100)
}

function computePrefill(slot: ExerciseSlot, unit: UnitSystem): { weight: string; reps: string } {
  const prevSet = slot.sets[slot.sets.length - 1]
  if (prevSet) return { weight: displayFromStored(prevSet.weight, unit), reps: prevSet.reps }
  if (slot.last && slot.last.sets.length > 0) {
    const firstLast = slot.last.sets[0]
    return {
      weight: firstLast.weight !== null ? formatWeight(firstLast.weight, unit) : '',
      reps: firstLast.reps !== null ? String(firstLast.reps) : '',
    }
  }
  return { weight: '', reps: '' }
}

function setsDone(slot: ExerciseSlot) {
  return slot.sets.length + slot.skipped
}

// Planned slots are done at their target; ad-hoc ones once they have a set.
function slotFinished(slot: ExerciseSlot) {
  return slot.targetSets !== null ? slot.done : slot.sets.length > 0
}

// Greedy per-side loadout, heaviest first (so heaviest sits innermost).
function plateLoadout(total: number, bar: number, denoms: number[], doubleSided: boolean) {
  let perSide = (total - bar) / (doubleSided ? 2 : 1)
  const plates: number[] = []
  if (!(perSide > 0)) return { plates, remainder: 0 }
  for (const d of denoms) {
    while (perSide + 1e-9 >= d) {
      plates.push(d)
      perSide -= d
    }
  }
  return { plates, remainder: Math.round(perSide * 100) / 100 }
}

// Stepper button that repeats while held (400ms delay, then every 120ms).
function HoldButton({
  onStep,
  className,
  label,
  children,
}: {
  onStep: () => void
  className: string
  label: string
  children: React.ReactNode
}) {
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({})
  const stepRef = useRef(onStep)
  useEffect(() => {
    stepRef.current = onStep
  }, [onStep])

  function stop() {
    clearTimeout(timers.current.delay)
    clearInterval(timers.current.repeat)
    timers.current = {}
  }
  useEffect(() => stop, [])

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onPointerDown={(e) => {
        e.preventDefault()
        stop()
        stepRef.current()
        timers.current.delay = setTimeout(() => {
          timers.current.repeat = setInterval(() => stepRef.current(), HOLD_REPEAT_MS)
        }, HOLD_DELAY_MS)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          stepRef.current()
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

// Big numerals shrink a step as the value gets longer so they never crop.
function valueSizeClass(value: string): string {
  const len = value.length
  if (len <= 3) return 'text-[76px] md:text-[62px]'
  if (len === 4) return 'text-[64px] md:text-[52px]'
  if (len === 5) return 'text-[54px] md:text-[44px]'
  return 'text-[44px] md:text-[36px]'
}

const valueInputClasses =
  'num w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-left leading-none font-black tracking-[-0.05em] text-bg placeholder:text-neutral-700 focus-visible:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

const fieldClasses =
  'w-full border-2 border-neutral-700 bg-transparent px-3 py-2.5 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none'

const smallBtn = 'px-3 py-2.5 text-left text-xs font-extrabold tracking-[0.06em] uppercase'

export default function SessionForm({
  day,
  exercisesWithLast,
  recentExercises,
}: {
  day: DayWithExercises
  exercisesWithLast: { exercise: Exercise; last: LastSets }[]
  recentExercises: { name: string; session_count: number }[]
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
  const [restTotal, setRestTotal] = useState(REST_SECONDS)
  const [restFor, setRestFor] = useState<RestFor | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const [unit, setUnit] = useState<UnitSystem>('lbs')

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
  const [pendingFinish, setPendingFinish] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const rawActiveIdx = slots.findIndex((s) => s.key === activeKey)
  const activeSlotIdx = rawActiveIdx !== -1 ? rawActiveIdx : 0
  const activeSlot = slots.length > 0 ? slots[activeSlotIdx] : null

  const plateDenominations = unit === 'kg' ? PLATE_DENOMINATIONS_KG : PLATE_DENOMINATIONS_LB
  const barWeight = unit === 'kg' ? BAR_WEIGHT_KG : BAR_WEIGHT_LB
  const weightBump = unit === 'kg' ? WEIGHT_BUMP_KG : WEIGHT_BUMP_LB

  // Read the unit preference on mount and keep it in sync with Settings.
  useEffect(() => {
    function sync() {
      setUnit(readStoredUnits())
    }
    sync()
    function onStorage(e: StorageEvent) {
      if (e.key === UNITS_STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Restore in-progress workout from localStorage on mount
  useEffect(() => {
    function restore() {
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
          // The rest timer stores its end timestamp, so it keeps counting
          // while the app is backgrounded or reloaded.
          if (parsed.restUntil && parsed.restUntil > Date.now()) {
            setNow(Date.now())
            setRestUntil(parsed.restUntil)
            setRestTotal(parsed.restTotal ?? REST_SECONDS)
            setRestFor(parsed.restFor ?? null)
            setMode('resting')
          }
        }
      } catch {
        // ignore restore errors
      }
      setRestored(true)
    }
    restore()
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
          restTotal,
          restFor,
        }
        localStorage.setItem(storageKey(day.id), JSON.stringify(toSave))
      } else {
        localStorage.removeItem(storageKey(day.id))
      }
    } catch {
      // ignore save errors
    }
  }, [slots, day.id, restored, startedAt, activeKey, mode, restUntil, restTotal, restFor])

  // Re-seed the weight/rep inputs whenever the active slot (or its progress) changes
  useEffect(() => {
    function sync() {
      if (!activeSlot) return
      const prefill = computePrefill(activeSlot, unit)
      setWeightInput(prefill.weight)
      setRepsInput(prefill.reps)
      setNotesInput('')
      setNotesOpen(false)
      setPlateCounts({})
      setPlateOpen(false)
    }
    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlotIdx, activeSlot?.name, activeSlot?.sets.length, activeSlot?.skipped, unit])

  // Tick the elapsed clock, and the rest countdown faster while resting.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), mode === 'resting' ? 250 : 1000)
    return () => clearInterval(id)
  }, [mode])

  const remainingSec = restUntil ? Math.ceil(Math.max(0, restUntil - now) / 1000) : 0

  // At zero: buzz and drop back to the set screen.
  useEffect(() => {
    if (mode !== 'resting' || !restUntil || now < restUntil) return
    function finishRest() {
      try {
        navigator.vibrate?.([200, 100, 200])
      } catch {
        // vibration unsupported
      }
      setMode('focus')
      setRestUntil(null)
    }
    finishRest()
  }, [mode, now, restUntil])

  // Submitting happens after render so the hidden payload includes the last set.
  useEffect(() => {
    if (!pendingFinish) return
    formRef.current?.requestSubmit()
  }, [pendingFinish])

  function bumpWeight(delta: number) {
    setWeightInput((prev) => {
      const next = Math.max(0, (parseFloat(prev) || 0) + delta)
      return String(Math.round(next * 100) / 100)
    })
  }

  function bumpReps(delta: number) {
    setRepsInput((prev) => String(Math.max(0, (parseInt(prev) || 0) + delta)))
  }

  function plateTotal(counts: Record<number, number>, barOn: boolean, doubleSided: boolean) {
    const perSide = plateDenominations.reduce((sum, denom) => sum + denom * (counts[denom] ?? 0), 0)
    const bar = barOn ? barWeight : 0
    return bar + perSide * (doubleSided ? 2 : 1)
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
    setEditWeight(displayFromStored(set.weight, unit))
    setEditReps(set.reps)
    setEditNotes(set.notes)
  }

  function cancelEditSet() {
    setEditingSet(null)
  }

  function saveEditSet() {
    if (!editingSet) return
    const weightLbs = toLbsString(editWeight, unit)
    setSlots((prev) =>
      prev.map((s) =>
        s.key === editingSet.slotKey
          ? {
              ...s,
              sets: s.sets.map((set, i) =>
                i === editingSet.setIdx ? { weight: weightLbs, reps: editReps, notes: editNotes } : set
              ),
            }
          : s
      )
    )
    setEditingSet(null)
  }

  function startRest(from: RestFor) {
    const startedNow = Date.now()
    setNow(startedNow)
    setRestTotal(REST_SECONDS)
    setRestUntil(startedNow + REST_SECONDS * 1000)
    setRestFor(from)
    setMode('resting')
  }

  function extendRest() {
    setRestUntil((prev) => (prev ?? Date.now()) + EXTEND_SECONDS * 1000)
    setRestTotal((t) => t + EXTEND_SECONDS)
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
    setEditingSet(null)
  }

  // Next unfinished slot after `fromIdx`, wrapping; null when everything's done.
  function nextOpenSlot(list: ExerciseSlot[], fromIdx: number): ExerciseSlot | null {
    for (let step = 1; step <= list.length; step++) {
      const candidate = list[(fromIdx + step) % list.length]
      if (!slotFinished(candidate)) return candidate
    }
    return null
  }

  function applySlotUpdate(updatedSlot: ExerciseSlot): { nextSlots: ExerciseSlot[]; allDone: boolean } {
    const nextSlots = slots.map((s, i) => (i === activeSlotIdx ? updatedSlot : s))
    setSlots(nextSlots)
    const allDone = nextSlots.every(slotFinished)
    if (updatedSlot.done && !allDone) {
      const next = nextOpenSlot(nextSlots, activeSlotIdx)
      if (next) setActiveKey(next.key)
    }
    return { nextSlots, allDone }
  }

  const isLastSetOfSession =
    !!activeSlot &&
    activeSlot.targetSets !== null &&
    setsDone(activeSlot) + 1 >= activeSlot.targetSets &&
    slots.every((s, i) => i === activeSlotIdx || slotFinished(s))

  function logSet() {
    if (!activeSlot) return
    const updatedSlot: ExerciseSlot = {
      ...activeSlot,
      sets: [...activeSlot.sets, { weight: toLbsString(weightInput, unit), reps: repsInput, notes: notesInput }],
    }
    if (updatedSlot.targetSets !== null && setsDone(updatedSlot) >= updatedSlot.targetSets) {
      updatedSlot.done = true
    }
    const { allDone } = applySlotUpdate(updatedSlot)
    setEditingSet(null)
    if (allDone && updatedSlot.targetSets !== null) {
      setIsSubmitting(true)
      setPendingFinish(true)
      return
    }
    startRest({ slotKey: activeSlot.key, name: activeSlot.name, setNumber: updatedSlot.sets.length + updatedSlot.skipped })
  }

  function skipSet() {
    if (!activeSlot) return
    const updatedSlot: ExerciseSlot = { ...activeSlot, skipped: activeSlot.skipped + 1 }
    if (updatedSlot.targetSets !== null && setsDone(updatedSlot) >= updatedSlot.targetSets) {
      updatedSlot.done = true
    }
    applySlotUpdate(updatedSlot)
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
    setStartedAt(Date.now())
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
    const key = uid()
    setSlots((prev) => [
      ...prev,
      {
        key,
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
    jumpTo(key)
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
  const sessionVolumeLbs = payload.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0)
  const elapsed = fmtElapsed(now - startedAt)
  const restLabel = fmtClock(REST_SECONDS)

  // One segment per planned set, plus logged sets of ad-hoc exercises.
  const segments = slots.flatMap((slot) => {
    const count = slot.targetSets ?? slot.sets.length + (slot.key === activeSlot?.key ? 1 : 0)
    return Array.from({ length: count }, (_, i) => {
      if (i < setsDone(slot)) return 'done'
      if (slot.key === activeSlot?.key && i === setsDone(slot)) return 'now'
      return 'todo'
    })
  })

  const currentSetNumber = activeSlot ? setsDone(activeSlot) + 1 : 1
  const lastTimeLabel =
    activeSlot?.last && activeSlot.last.sets.length > 0
      ? (() => {
          const s = activeSlot.last.sets[Math.min(setsDone(activeSlot), activeSlot.last.sets.length - 1)]
          return `last time ${formatWeight(s.weight, unit)} × ${s.reps ?? '–'}`
        })()
      : null
  const setMeta = [
    activeSlot?.targetSets != null
      ? `Set ${pad(currentSetNumber)} of ${pad(activeSlot.targetSets)}`
      : `Set ${pad(currentSetNumber)}`,
    lastTimeLabel,
  ]
    .filter(Boolean)
    .join(' · ')

  const weightNum = parseFloat(weightInput)
  const loadout =
    activeSlot && Number.isFinite(weightNum)
      ? plateLoadout(weightNum, activeSlot.plateBarOn ? barWeight : 0, plateDenominations, activeSlot.plateDouble)
      : { plates: [], remainder: 0 }

  // ---------- pieces ----------

  function renderPlateMath({ compact }: { compact?: boolean } = {}) {
    const { plates, remainder } = loadout
    const maxDenom = plateDenominations[0]
    const minDenom = plateDenominations[plateDenominations.length - 1]
    const lightest = plates.length > 0 ? plates[plates.length - 1] : null
    const distinct = new Set(plates).size
    const plate = (d: number, i: number) => {
      const t = (d - minDenom) / (maxDenom - minDenom)
      const h = compact ? Math.round(12 + t * 14) : Math.round(20 + t * 24)
      const w = compact ? Math.round(4 + t * 4) : Math.round(8 + t * 8)
      const accent = distinct > 1 && d === lightest
      return <i key={i} className={`block shrink-0 ${accent ? 'bg-accent' : 'bg-bg'}`} style={{ width: w, height: h }} />
    }
    const inner = [...plates] // heaviest first = innermost
    const caption =
      plates.length === 0
        ? activeSlot?.plateBarOn
          ? `Empty bar · ${barWeight}`
          : 'No plates'
        : `${plates.join(' + ')}${remainder > 0 ? ` (+${remainder} left)` : ''}${activeSlot?.plateBarOn ? ` · bar ${barWeight}` : ''}`
    return (
      <div>
        <div className={`flex items-center gap-[3px] ${compact ? 'h-[26px] w-[140px]' : 'h-11'}`} aria-hidden="true">
          {[...inner].reverse().map(plate)}
          <i className={`block min-w-4 flex-1 bg-neutral-700 ${compact ? 'h-[3px]' : 'h-[5px]'}`} />
          {inner.map(plate)}
        </div>
        <div className={`k text-neutral-500 ${compact ? 'mt-1.5' : 'mt-3'}`}>{caption}</div>
      </div>
    )
  }

  function renderStepper({
    label,
    value,
    onChange,
    onStep,
    inputMode,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    onStep: (dir: 1 | -1) => void
    inputMode: 'decimal' | 'numeric'
  }) {
    return (
      <div>
        <div className="k text-neutral-500">{label}</div>
        <div className="mt-1.5 flex items-center gap-3 md:mt-2 md:gap-2.5">
          <HoldButton
            onStep={() => onStep(-1)}
            label={`Decrease ${label.toLowerCase()}`}
            className="btn-outline flex h-16 w-16 shrink-0 touch-none items-center justify-center text-[26px] font-extrabold text-bg select-none md:h-14 md:w-14 md:text-2xl"
          >
            −
          </HoldButton>
          <input
            type="number"
            inputMode={inputMode}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="0"
            aria-label={label}
            className={`${valueInputClasses} ${valueSizeClass(value)}`}
          />
          <HoldButton
            onStep={() => onStep(1)}
            label={`Increase ${label.toLowerCase()}`}
            className="btn-primary flex h-16 w-16 shrink-0 touch-none items-center justify-center text-[26px] font-extrabold select-none md:h-14 md:w-14 md:text-2xl"
          >
            +
          </HoldButton>
        </div>
      </div>
    )
  }

  function renderAddExerciseForm() {
    return (
      <div className="space-y-2">
        <p className="k text-neutral-500">Add an exercise for this workout only</p>
        <ExerciseNamePicker
          value={addName}
          onChange={setAddName}
          recent={recentExercises}
          placeholder="Exercise name (e.g. Incline DB Press)"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-0.5">
          <button type="button" disabled={addBusy || !addName.trim()} onClick={confirmAdd} className={`btn-primary ${smallBtn}`}>
            {addBusy ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAddOpen(false)
              setAddName('')
            }}
            className={`btn-outline text-bg ${smallBtn}`}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Left column on desktop; the "Exercise 02 / 05" sheet on mobile.
  function renderExerciseList() {
    return (
      <div>
        <div className="k mb-3 text-neutral-500">
          Today · {slots.length} exercise{slots.length === 1 ? '' : 's'}
        </div>
        <div className="border-y-2 border-neutral-700">
          {slots.map((s, idx) => {
            const current = idx === activeSlotIdx
            const finished = slotFinished(s)
            const count = s.targetSets !== null ? `${setsDone(s)}/${s.targetSets}` : `${s.sets.length} set${s.sets.length === 1 ? '' : 's'}`
            if (swapKey === s.key) {
              return (
                <div key={s.key} className={`space-y-2 py-3 ${idx > 0 ? 'border-t border-neutral-800' : ''}`}>
                  <p className="k text-neutral-500">Swap {s.name} for</p>
                  <ExerciseNamePicker value={swapName} onChange={setSwapName} recent={recentExercises} placeholder="Exercise name" autoFocus />
                  <div className="grid grid-cols-2 gap-0.5">
                    <button type="button" disabled={swapBusy || !swapName.trim()} onClick={() => confirmSwap(idx)} className={`btn-primary ${smallBtn}`}>
                      {swapBusy ? 'Swapping…' : 'Swap'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSwapKey(null)
                        setSwapName('')
                      }}
                      className={`btn-outline text-bg ${smallBtn}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }
            return (
              <div
                key={s.key}
                className={`group ${current ? '-mx-5 bg-accent px-5 text-bg' : idx > 0 ? 'border-t border-neutral-800' : ''}`}
              >
                <button type="button" onClick={() => jumpTo(s.key)} className="flex w-full items-baseline justify-between gap-3 py-[13px] text-left">
                  <span className={`min-w-0 truncate text-[15px] font-extrabold uppercase ${!current && !finished ? 'text-neutral-500' : ''}`}>{s.name}</span>
                  <span className={`k shrink-0 ${current ? 'opacity-85' : 'text-neutral-500'}`}>
                    {count}
                    {finished && !current ? ' ✓' : ''}
                  </span>
                </button>
                <div className={`-mt-2 flex gap-3 pb-2.5 ${current ? '' : 'hidden group-focus-within:flex group-hover:flex'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSwapKey(s.key)
                      setSwapName('')
                    }}
                    className={`k ${current ? 'opacity-85 hover:opacity-100' : 'text-neutral-500 hover:text-bg'}`}
                  >
                    Swap
                  </button>
                  {s.source === 'adhoc' && (
                    <button type="button" onClick={() => removeSlot(idx)} className={`k ${current ? 'opacity-85 hover:opacity-100' : 'text-neutral-500 hover:text-bg'}`}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3.5">
          {addOpen ? renderAddExerciseForm() : (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full border-2 border-dashed border-neutral-700 p-[13px] text-left text-[11px] font-extrabold tracking-[0.06em] text-neutral-500 uppercase hover:text-bg"
            >
              + Add exercise
            </button>
          )}
        </div>
      </div>
    )
  }

  function renderSetChips() {
    if (!activeSlot) return null
    return (
      <div className="flex flex-wrap gap-0.5">
        {activeSlot.sets.map((set, idx) => {
          const editing = editingSet?.slotKey === activeSlot.key && editingSet.setIdx === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => (editing ? cancelEditSet() : startEditSet(activeSlot.key, idx))}
              className={`k num border-2 px-2.5 py-2 md:px-[11px] md:py-[9px] ${editing ? 'border-bg text-bg' : 'border-neutral-700 text-neutral-500 hover:text-bg'}`}
            >
              <span className="hidden md:inline">Set {pad(idx + 1)} · </span>
              {displayFromStored(set.weight, unit) || '–'} × {set.reps || '–'}
            </button>
          )
        })}
        <span className="k border-2 border-accent px-2.5 py-2 text-accent md:px-[11px] md:py-[9px]">
          <span className="hidden md:inline">Set {pad(currentSetNumber)} · </span>Now
        </span>
      </div>
    )
  }

  function renderEditSetPanel() {
    if (!editingSet || editingSet.slotKey !== activeSlot?.key) return null
    return (
      <div className="space-y-2 border-2 border-neutral-700 p-3">
        <p className="k text-neutral-500">Edit set {pad(editingSet.setIdx + 1)}</p>
        <div className="grid grid-cols-2 gap-0.5">
          <input
            type="number"
            inputMode="decimal"
            value={editWeight}
            onChange={(e) => setEditWeight(e.target.value)}
            placeholder={`Weight (${unitLabel(unit)})`}
            autoFocus
            className={`${fieldClasses} num font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <input
            type="number"
            inputMode="numeric"
            value={editReps}
            onChange={(e) => setEditReps(e.target.value)}
            placeholder="Reps"
            className={`${fieldClasses} num font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
        </div>
        <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="RPE / notes" className={fieldClasses} />
        <div className="grid grid-cols-2 gap-0.5">
          <button type="button" onClick={saveEditSet} className={`btn-primary ${smallBtn}`}>
            Save
          </button>
          <button type="button" onClick={cancelEditSet} className={`btn-outline text-bg ${smallBtn}`}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  function renderPlateCalculator() {
    if (!activeSlot || !plateOpen) return null
    return (
      <div className="space-y-3 border-2 border-neutral-700 p-3">
        <div className="grid grid-cols-2 gap-0.5">
          <button
            type="button"
            onClick={toggleSlotPlateBar}
            className={`border-2 px-3 py-2 text-left text-[11px] font-extrabold tracking-wide uppercase ${
              activeSlot.plateBarOn ? 'border-accent text-accent' : 'border-neutral-700 text-neutral-500'
            }`}
          >
            Bar {activeSlot.plateBarOn ? `on · ${barWeight} ${unitLabel(unit)}` : 'off'}
          </button>
          <button
            type="button"
            onClick={toggleSlotPlateDouble}
            className={`border-2 px-3 py-2 text-left text-[11px] font-extrabold tracking-wide uppercase ${
              activeSlot.plateDouble ? 'border-accent text-accent' : 'border-neutral-700 text-neutral-500'
            }`}
          >
            {activeSlot.plateDouble ? 'Double sided' : 'Single sided'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="k text-neutral-500">Load plates per side</p>
          <button type="button" onClick={resetPlates} className="k text-neutral-500 hover:text-bg">
            Clear
          </button>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {plateDenominations.map((denom) => {
            const count = plateCounts[denom] ?? 0
            return (
              <div key={denom} className={`flex flex-col gap-1.5 border-2 p-2 ${count > 0 ? 'border-accent' : 'border-neutral-700'}`}>
                <span className="num text-lg font-black text-bg">{denom}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => removePlate(denom)}
                    disabled={count === 0}
                    className="btn-outline h-7 w-7 shrink-0 text-sm font-black text-bg"
                    aria-label={`Remove ${denom} ${unitLabel(unit)} plate`}
                  >
                    −
                  </button>
                  <span className="num w-4 text-center text-sm font-black text-bg">{count}</span>
                  <button
                    type="button"
                    onClick={() => addPlate(denom)}
                    className="btn-primary h-7 w-7 shrink-0 text-sm font-black"
                    aria-label={`Add ${denom} ${unitLabel(unit)} plate`}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <p className="k text-neutral-500">
          {activeSlot.plateBarOn ? `${barWeight} bar` : 'No bar'} + {plateDenominations.reduce((sum, d) => sum + d * (plateCounts[d] ?? 0), 0)} ×{' '}
          {activeSlot.plateDouble ? 2 : 1} = {plateTotal(plateCounts, activeSlot.plateBarOn, activeSlot.plateDouble)} {unitLabel(unit)}
        </p>
      </div>
    )
  }

  function renderFinishButton({ className }: { className: string }) {
    return (
      <button type="submit" disabled={isSubmitting || !hasInProgress} className={className}>
        {isSubmitting ? 'Saving…' : 'Finish workout'}
      </button>
    )
  }

  // Segment bar for the rest countdown: elapsed segments are solid.
  function restSegments(count: number) {
    const elapsedFrac = restTotal > 0 ? 1 - remainingSec / restTotal : 1
    const filled = Math.round(Math.min(1, Math.max(0, elapsedFrac)) * count)
    return Array.from({ length: count }, (_, i) => i < filled)
  }

  const resting = mode === 'resting'
  const upNext = activeSlot
    ? {
        exerciseChanged: restFor !== null && restFor.slotKey !== activeSlot.key,
        text: `Set ${pad(currentSetNumber)} · ${weightInput || '–'} × ${repsInput || '–'}`,
      }
    : null

  // ---------- layout ----------

  return (
    <form
      ref={formRef}
      action={finishSession}
      onSubmit={() => setIsSubmitting(true)}
      className="flex min-h-dvh flex-col md:min-h-screen"
    >
      <input type="hidden" name="dayId" value={day.id} />
      <input type="hidden" name="sets" value={JSON.stringify(payload)} />
      <input type="hidden" name="startedAt" value={String(startedAt)} />

      {/* Mobile top bar */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-neutral-700 px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-3.5 md:hidden">
        <span className="k num min-w-0 truncate text-neutral-500">
          {day.name} · {elapsed}
        </span>
        <button type="button" onClick={() => setOverviewOpen(true)} className="k num shrink-0 text-neutral-500 hover:text-bg" aria-haspopup="dialog">
          Exercise {pad(activeSlotIdx + 1)} / {pad(slots.length)} ▾
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden items-center justify-between gap-4 border-b-2 border-neutral-700 px-7 py-4 md:flex">
        <span className="flex min-w-0 items-center gap-4">
          <Link href="/log" className="k text-neutral-500 hover:text-bg">
            ← Log
          </Link>
          <span className="truncate text-xl font-black tracking-[-0.02em] uppercase">{day.name} · in progress</span>
        </span>
        <span className="num text-2xl font-black text-accent">{elapsed}</span>
        {renderFinishButton({ className: "btn-outline px-4 py-[11px] text-[11px] font-extrabold tracking-[0.08em] text-bg uppercase" })}
      </div>

      {slots.length === 0 ? (
        <div className="space-y-4 px-[18px] py-8 md:mx-auto md:w-full md:max-w-[560px]">
          <div className="k text-accent">No exercises</div>
          <p className="text-[15px] leading-[1.5] font-medium text-neutral-500">
            {day.name} has no exercises yet. Add one for this workout, or set them up on the Plan tab.
          </p>
          {addOpen ? renderAddExerciseForm() : (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full border-2 border-dashed border-neutral-700 p-[13px] text-left text-xs font-extrabold tracking-[0.06em] text-neutral-500 uppercase hover:text-bg"
            >
              + Add exercise
            </button>
          )}
          <Link href="/log" className="k block text-neutral-500 hover:text-bg">
            ← Back to Log
          </Link>
        </div>
      ) : activeSlot ? (
        <div className="flex flex-1 flex-col md:grid md:grid-cols-[300px_1fr_300px]">
          {/* Desktop left: exercise list */}
          <aside className="hidden border-r-2 border-neutral-700 px-5 py-[26px] md:block">
            {renderExerciseList()}
            {hasInProgress && (
              <button type="button" onClick={clearProgress} className="k mt-6 text-neutral-500 hover:text-bg">
                Clear progress
              </button>
            )}
          </aside>

          {/* Center: the set */}
          <section className="flex flex-1 flex-col md:px-7 md:pt-[30px] md:pb-[34px]">
            <div
              className="grid gap-0.5 px-[18px] py-2.5 md:mb-6 md:px-0 md:pt-0"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, segments.length)}, minmax(0, 1fr))` }}
              aria-label={`${segments.filter((s) => s === 'done').length} of ${segments.length} sets done`}
            >
              {segments.map((s, i) => (
                <i key={i} className={`block h-1.5 ${s === 'done' ? 'bg-bg' : s === 'now' ? 'bg-accent' : 'bg-neutral-800'}`} />
              ))}
            </div>

            <div className="px-[18px] pt-3.5 md:px-0 md:pt-0">
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="text-[32px] leading-[0.95] font-black tracking-[-0.035em] break-words uppercase md:text-[56px] md:leading-[0.92] md:tracking-[-0.045em]">
                  {activeSlot.name}
                </h1>
                {activeSlot.targetSets !== null && (
                  <span className="k hidden shrink-0 border-2 border-neutral-700 px-2 py-[5px] text-neutral-500 md:inline">
                    Target {activeSlot.targetSets} × {activeSlot.targetReps}
                  </span>
                )}
              </div>
              <div className="k num mt-2 text-neutral-500 md:mt-3">{setMeta}</div>
            </div>

            <div className="mx-[18px] mt-[22px] grid gap-5 border-y-2 border-neutral-700 py-[18px] md:mx-0 md:mt-[26px] md:grid-cols-2 md:gap-[18px] md:border-0 md:py-0">
              <div>
                {renderStepper({ label: `Weight · ${unitLabel(unit)}`, value: weightInput, onChange: setWeightInput, onStep: (dir) => bumpWeight(dir * weightBump), inputMode: "decimal" })}
                <button
                  type="button"
                  onClick={() => setPlateOpen((v) => !v)}
                  aria-expanded={plateOpen}
                  className="mt-3 flex w-full items-center justify-between gap-3 text-left md:hidden"
                >
                  {renderPlateMath({ compact: true })}
                  <span className="k shrink-0 text-neutral-500">{plateOpen ? 'Hide plates ▴' : 'Plates ▾'}</span>
                </button>
              </div>
              {renderStepper({ label: "Reps", value: repsInput, onChange: setRepsInput, onStep: (dir) => bumpReps(dir), inputMode: "numeric" })}
            </div>

            <div className="space-y-3.5 px-[18px] pt-3.5 md:px-0 md:pt-[22px]">
              {renderPlateCalculator()}
              {renderSetChips()}
              {renderEditSetPanel()}
              {notesOpen && (
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="RPE / notes for this set"
                  autoFocus
                  className={fieldClasses}
                />
              )}
            </div>

            {/* Actions: pinned to the bottom on mobile */}
            <div className="sticky bottom-0 mt-auto bg-ink px-[18px] pt-3.5 pb-[max(18px,env(safe-area-inset-bottom))] md:static md:mt-[22px] md:px-0 md:pt-0 md:pb-0">
              <button
                type="button"
                onClick={logSet}
                disabled={isSubmitting}
                className="btn-primary block w-full px-[18px] py-[26px] text-left text-xl font-black tracking-[0.02em] uppercase md:px-[22px] md:py-[22px] md:text-lg"
              >
                {isLastSetOfSession ? 'Log set · finish' : `Log set · rest ${restLabel}`}
              </button>
              <div className="mt-0.5 grid grid-cols-2 gap-0.5">
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  aria-pressed={notesOpen}
                  className="btn-outline p-3.5 text-left text-xs font-extrabold tracking-[0.06em] text-bg uppercase"
                >
                  {notesOpen ? 'Hide note' : 'Note / RPE'}
                </button>
                <button type="button" onClick={skipSet} className="btn-outline p-3.5 text-left text-xs font-extrabold tracking-[0.06em] text-bg uppercase">
                  Skip set
                </button>
              </div>
            </div>
          </section>

          {/* Desktop right: rest, plate math, volume */}
          <aside className="hidden border-l-2 border-neutral-700 px-5 py-[26px] md:block">
            <div className="k text-neutral-500">Rest</div>
            <div className={`num mt-2 text-[62px] leading-[0.9] font-black tracking-[-0.05em] ${resting ? 'text-accent' : 'text-neutral-700'}`}>
              {resting ? fmtClock(remainingSec) : restLabel}
            </div>
            <div className="mt-3.5 grid grid-cols-12 gap-0.5">
              {restSegments(12).map((on, i) => (
                <i key={i} className={`block h-3 ${resting && on ? 'bg-accent' : 'bg-neutral-800'}`} />
              ))}
            </div>
            {resting ? (
              <div className="mt-3 grid grid-cols-2 gap-0.5">
                <button type="button" onClick={extendRest} className={`btn-outline text-bg ${smallBtn}`}>
                  +30 sec
                </button>
                <button type="button" onClick={endRest} className={`bg-bg text-ink hover:opacity-90 ${smallBtn}`}>
                  Skip rest →
                </button>
              </div>
            ) : (
              <div className="k mt-3 text-neutral-500">Starts when you log a set</div>
            )}

            <div className="mt-7 border-t-2 border-neutral-700 pt-3.5">
              <div className="flex items-baseline justify-between">
                <div className="k text-neutral-500">Plate math · per side</div>
                <button type="button" onClick={() => setPlateOpen((v) => !v)} aria-expanded={plateOpen} className="k text-neutral-500 hover:text-bg">
                  {plateOpen ? 'Hide' : 'Load'}
                </button>
              </div>
              <div className="mt-3">
                {renderPlateMath()}
              </div>
            </div>

            <div className="mt-7 border-t-2 border-neutral-700 pt-3.5">
              <div className="k text-neutral-500">Session volume</div>
              <div className="num mt-2 text-[44px] leading-none font-black tracking-[-0.045em]">{formatVolume(sessionVolumeLbs, unit)}</div>
              <div className="k mt-1.5 text-neutral-500">{unitLabel(unit)} moved so far</div>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Mobile: rest takeover */}
      {resting && activeSlot && (
        <div role="dialog" aria-label="Resting" className="rest-wipe fixed inset-0 z-50 flex flex-col bg-accent text-bg md:hidden">
          <div className="flex justify-between gap-3 px-[18px] pt-[max(22px,env(safe-area-inset-top))]">
            <span className="k">Resting</span>
            <span className="k truncate opacity-75">
              {restFor ? `${restFor.name} · set ${pad(restFor.setNumber)}` : activeSlot.name}
            </span>
          </div>
          <div className="mt-[72px] px-[18px]">
            <div className="num text-[148px] leading-[0.78] font-black tracking-[-0.065em]" aria-live="off">
              {fmtClock(remainingSec)}
            </div>
            <div className="mt-[26px] grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
              {restSegments(24).map((on, i) => (
                <i key={i} className={`block h-4 ${on ? 'bg-bg' : 'bg-bg/30'}`} />
              ))}
            </div>
          </div>
          {upNext && (
            <div className="mx-[18px] mt-[60px] border-t-2 border-bg pt-3.5">
              <div className="k opacity-75">Up next{upNext.exerciseChanged ? ` · ${activeSlot.name}` : ''}</div>
              <div className="num mt-2 text-[34px] leading-none font-black tracking-[-0.035em] uppercase">{upNext.text}</div>
            </div>
          )}
          <div className="mt-auto grid grid-cols-2 border-t-2 border-bg">
            <button
              type="button"
              onClick={extendRest}
              className="border-r-2 border-bg px-4 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] text-left text-[13px] font-extrabold tracking-[0.06em] uppercase active:bg-bg/15"
            >
              +30 sec
            </button>
            <button
              type="button"
              onClick={endRest}
              className="bg-bg px-4 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] text-left text-[13px] font-extrabold tracking-[0.06em] text-ink uppercase active:opacity-80"
            >
              Skip rest →
            </button>
          </div>
        </div>
      )}

      {/* Mobile: exercise sheet */}
      {overviewOpen && (
        <div role="dialog" aria-label="Exercises" className="screen-in fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink md:hidden">
          <div className="flex items-center justify-between border-b-2 border-neutral-700 px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-3.5">
            <span className="k num text-neutral-500">
              {day.name} · {elapsed}
            </span>
            <button type="button" onClick={() => setOverviewOpen(false)} className="k text-bg">
              Close ✕
            </button>
          </div>
          <div className="flex-1 px-5 pt-5 pb-6">
            {renderExerciseList()}
          </div>
          <div className="space-y-0.5 px-[18px] pb-[max(18px,env(safe-area-inset-bottom))]">
            {renderFinishButton({ className: "btn-primary block w-full px-[18px] py-5 text-left text-lg font-black tracking-[0.02em] uppercase" })}
            <div className="grid grid-cols-2 gap-0.5">
              <Link href="/log" className="btn-outline p-3.5 text-left text-xs font-extrabold tracking-[0.06em] text-bg uppercase">
                ← Leave (saved)
              </Link>
              <button
                type="button"
                onClick={clearProgress}
                disabled={!hasInProgress}
                className="btn-outline p-3.5 text-left text-xs font-extrabold tracking-[0.06em] text-bg uppercase"
              >
                Clear progress
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
