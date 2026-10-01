import { createClient } from '@/lib/supabase/server'
import { normalizeExerciseName } from './db'
import type { DayWithExercises, Plan } from './types'

// Derived "scoreboard" data shared by Log, Plan, History and Stats.

export type SessionStub = { id: string; day_id: string | null; performed_at: string }
export type PlanWithFullDays = Plan & { days: DayWithExercises[] }

export type Training = {
  plans: PlanWithFullDays[]
  sessions: SessionStub[] // newest first
  activePlan: PlanWithFullDays | null
}

const DAY_MS = 86400000

export async function getTraining(): Promise<Training> {
  const supabase = await createClient()
  const [plansRes, daysRes, exercisesRes, sessionsRes] = await Promise.all([
    supabase.from('plans').select('*').order('created_at', { ascending: true }),
    supabase.from('days').select('*').order('position', { ascending: true }),
    supabase.from('exercises').select('*').order('position', { ascending: true }),
    supabase.from('sessions').select('id, day_id, performed_at').order('performed_at', { ascending: false }),
  ])
  if (plansRes.error) throw plansRes.error
  if (daysRes.error) throw daysRes.error
  if (exercisesRes.error) throw exercisesRes.error
  if (sessionsRes.error) throw sessionsRes.error

  const exercises = exercisesRes.data ?? []
  const plans: PlanWithFullDays[] = (plansRes.data ?? []).map((plan) => ({
    ...plan,
    days: (daysRes.data ?? [])
      .filter((d) => d.plan_id === plan.id)
      .map((d) => ({ ...d, exercises: exercises.filter((ex) => ex.day_id === d.id) })),
  }))
  const sessions = (sessionsRes.data ?? []) as SessionStub[]

  return { plans, sessions, activePlan: pickActivePlan(plans, sessions) }
}

// The plan you're "on" is the one you last trained from; before any sessions,
// it's the first plan that has days in it.
function pickActivePlan(plans: PlanWithFullDays[], sessions: SessionStub[]) {
  for (const s of sessions) {
    const plan = plans.find((p) => p.days.some((d) => d.id === s.day_id))
    if (plan) return plan
  }
  return plans.find((p) => p.days.length > 0) ?? plans[0] ?? null
}

// "Today" is the day after the most recently logged day of the active plan,
// in plan order (wrapping around).
export function nextDay(training: Training): DayWithExercises | null {
  const plan = training.activePlan
  if (!plan || plan.days.length === 0) return null
  const last = training.sessions.find((s) => plan.days.some((d) => d.id === s.day_id))
  if (!last) return plan.days[0]
  const idx = plan.days.findIndex((d) => d.id === last.day_id)
  return plan.days[(idx + 1) % plan.days.length]
}

export function daysSinceTrained(training: Training, dayId: string, now = Date.now()): number | null {
  const last = training.sessions.find((s) => s.day_id === dayId)
  if (!last) return null
  return Math.max(0, Math.floor((now - new Date(last.performed_at).getTime()) / DAY_MS))
}

// Training week number, counted from the first session ever logged.
export function trainingWeek(training: Training, now = Date.now()): number {
  const first = training.sessions[training.sessions.length - 1]
  if (!first) return 1
  return Math.floor((weekStart(now) - weekStart(new Date(first.performed_at).getTime())) / (7 * DAY_MS)) + 1
}

function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const mondayOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - mondayOffset)
  return d.getTime()
}

export type WeekBar = { start: number; count: number; current: boolean }

export type WeeklyBoard = {
  weeks: WeekBar[] // oldest -> newest, last one is the current week
  max: number
  streak: number
  bestStreak: number
}

// A week counts toward the streak when it has at least as many sessions as the
// active plan has days. The current week only counts once it's met — until
// then it neither adds to nor breaks the streak.
export function weeklyBoard(training: Training, weeks = 12, now = Date.now()): WeeklyBoard {
  const target = Math.max(1, training.activePlan?.days.length ?? 1)
  const counts = new Map<number, number>()
  for (const s of training.sessions) {
    const key = weekStart(new Date(s.performed_at).getTime())
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const thisWeek = weekStart(now)
  const bars: WeekBar[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = shiftWeeks(thisWeek, -i)
    bars.push({ start, count: counts.get(start) ?? 0, current: i === 0 })
  }

  let streak = 0
  let cursor = thisWeek
  if ((counts.get(cursor) ?? 0) < target) cursor = shiftWeeks(cursor, -1)
  while ((counts.get(cursor) ?? 0) >= target) {
    streak++
    cursor = shiftWeeks(cursor, -1)
  }

  let bestStreak = 0
  if (training.sessions.length > 0) {
    const first = weekStart(new Date(training.sessions[training.sessions.length - 1].performed_at).getTime())
    let run = 0
    for (let w = first; w <= thisWeek; w = shiftWeeks(w, 1)) {
      if ((counts.get(w) ?? 0) >= target) {
        run++
        bestStreak = Math.max(bestStreak, run)
      } else if (w !== thisWeek) {
        run = 0
      }
    }
  }

  return { weeks: bars, max: Math.max(1, ...bars.map((b) => b.count)), streak, bestStreak }
}

// Adding 7 days by date (not ms) keeps week keys aligned across DST changes.
function shiftWeeks(ts: number, n: number) {
  const d = new Date(ts)
  d.setDate(d.getDate() + n * 7)
  return d.getTime()
}

export type TopSet = { weight: number | null; reps: number | null }

// Heaviest set from the most recent session of each planned exercise.
export async function getLastTopSets(exerciseIds: string[]): Promise<Map<string, TopSet>> {
  const result = new Map<string, TopSet>()
  if (exerciseIds.length === 0) return result
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('set_logs')
    .select('exercise_id, weight, reps, session_id, sessions!inner(performed_at)')
    .in('exercise_id', exerciseIds)
  if (error || !data) return result

  type Row = { exercise_id: string; weight: number | null; reps: number | null; session_id: string; sessions: { performed_at: string } | null }
  const latest = new Map<string, { at: string; session: string }>()
  for (const row of data as unknown as Row[]) {
    const at = row.sessions?.performed_at ?? ''
    const cur = latest.get(row.exercise_id)
    if (!cur || at > cur.at) latest.set(row.exercise_id, { at, session: row.session_id })
  }
  for (const row of data as unknown as Row[]) {
    if (latest.get(row.exercise_id)?.session !== row.session_id) continue
    const cur = result.get(row.exercise_id)
    if (!cur || (row.weight ?? 0) > (cur.weight ?? 0)) result.set(row.exercise_id, { weight: row.weight, reps: row.reps })
  }
  return result
}

export type SessionTotals = { sets: number; volume: number; prs: Map<string, number> }

// Per-session totals and PRs, in one pass over every logged set.
// PR rule (used everywhere): a session's heaviest weight for an exercise beats
// the heaviest weight from every earlier session of that exercise. The first
// time an exercise is logged sets the baseline — it isn't a PR. The map value
// is the delta over the previous best.
export async function getSessionTotals(): Promise<Map<string, SessionTotals>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('set_logs')
    .select('session_id, exercise_name, weight, reps, sessions!inner(performed_at)')
  if (error) throw error

  type Row = { session_id: string; exercise_name: string; weight: number | null; reps: number | null; sessions: { performed_at: string } | null }
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.sessions)

  const bySession = new Map<string, { at: string; rows: Row[] }>()
  for (const row of rows) {
    if (!bySession.has(row.session_id)) bySession.set(row.session_id, { at: row.sessions!.performed_at, rows: [] })
    bySession.get(row.session_id)!.rows.push(row)
  }

  const ordered = [...bySession.entries()].sort((a, b) => a[1].at.localeCompare(b[1].at))
  const bestSoFar = new Map<string, number>()
  const totals = new Map<string, SessionTotals>()

  for (const [sessionId, { rows: sRows }] of ordered) {
    const sessionMax = new Map<string, number>()
    let volume = 0
    for (const r of sRows) {
      volume += (r.weight ?? 0) * (r.reps ?? 0)
      const key = normalizeExerciseName(r.exercise_name)
      if (!key || r.weight === null) continue
      sessionMax.set(key, Math.max(sessionMax.get(key) ?? 0, r.weight))
    }
    const prs = new Map<string, number>()
    for (const [key, weight] of sessionMax) {
      const prior = bestSoFar.get(key)
      if (prior !== undefined && weight > prior) prs.set(key, weight - prior)
      bestSoFar.set(key, Math.max(prior ?? 0, weight))
    }
    totals.set(sessionId, { sets: sRows.length, volume, prs })
  }
  return totals
}
