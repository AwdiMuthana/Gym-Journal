import { createClient } from '@/lib/supabase/server'
import type { Plan, Day, Exercise, PlanWithDays, DayWithExercises } from './types'

export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPlanWithDays(planId: string): Promise<PlanWithDays | null> {
  const supabase = await createClient()
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()
  if (planErr || !plan) return null

  const { data: days, error: daysErr } = await supabase
    .from('days')
    .select('*')
    .eq('plan_id', planId)
    .order('position', { ascending: true })
  if (daysErr) throw daysErr

  const dayIds = (days ?? []).map((d) => d.id)
  const { data: exercises, error: exErr } = dayIds.length
    ? await supabase
        .from('exercises')
        .select('*')
        .in('day_id', dayIds)
        .order('position', { ascending: true })
    : { data: [], error: null }
  if (exErr) throw exErr

  const daysWithExercises: DayWithExercises[] = (days ?? []).map((day) => ({
    ...day,
    exercises: (exercises ?? []).filter((ex) => ex.day_id === day.id),
  }))

  return { ...plan, days: daysWithExercises }
}

export async function getDayWithExercises(dayId: string): Promise<DayWithExercises | null> {
  const supabase = await createClient()
  const { data: day, error: dayErr } = await supabase
    .from('days')
    .select('*')
    .eq('id', dayId)
    .single()
  if (dayErr || !day) return null

  const { data: exercises, error: exErr } = await supabase
    .from('exercises')
    .select('*')
    .eq('day_id', dayId)
    .order('position', { ascending: true })
  if (exErr) throw exErr

  return { ...day, exercises: exercises ?? [] }
}

export async function getAllDaysForUser(): Promise<(Day & { plan_name: string })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('days')
    .select('*, plans(name)')
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: Day & { plans: { name: string } | null }) => ({
    ...row,
    plan_name: row.plans?.name ?? '',
  }))
}

export async function getLastSetsForExercise(exerciseId: string): Promise<{
  performed_at: string
  sets: { weight: number | null; reps: number | null; notes: string | null }[]
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('set_logs')
    .select('weight, reps, notes, set_number, sessions!inner(performed_at)')
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: true })
  if (error || !data || data.length === 0) return null

  // Group by session, take most recent
  type Row = { weight: number | null; reps: number | null; notes: string | null; set_number: number; sessions: { performed_at: string } | null }
  const rows = data as unknown as Row[]
  const sessions = new Map<string, Row[]>()
  for (const row of rows) {
    const key = row.sessions?.performed_at ?? ''
    if (!sessions.has(key)) sessions.set(key, [])
    sessions.get(key)!.push(row)
  }
  const sorted = [...sessions.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  if (sorted.length === 0) return null
  const [performed_at, rowsForSession] = sorted[0]
  return {
    performed_at,
    sets: rowsForSession.map((r) => ({ weight: r.weight, reps: r.reps, notes: r.notes })),
  }
}
export async function getPlansWithSessions(): Promise<{ id: string; name: string; days: Day[] }[]> {
  const supabase = await createClient()
  const { data: plans, error: plansErr } = await supabase
    .from('plans')
    .select('*')
    .order('created_at', { ascending: true })
  if (plansErr) throw plansErr

  const { data: days, error: daysErr } = await supabase
    .from('days')
    .select('*')
    .order('position', { ascending: true })
  if (daysErr) throw daysErr

  return (plans ?? []).map((plan) => ({
    id: plan.id,
    name: plan.name,
    days: (days ?? []).filter((d) => d.plan_id === plan.id),
  }))
}

export type SessionListItem = {
  id: string
  performed_at: string
  day_name: string | null
  plan_name: string | null
  total_sets: number
}

export async function getSessionsList(): Promise<SessionListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, performed_at, day_id, days(name, plans(name)), set_logs(id)')
    .order('performed_at', { ascending: false })
  if (error) throw error
  type Row = {
    id: string
    performed_at: string
    day_id: string | null
    days: { name: string; plans: { name: string } | null } | null
    set_logs: { id: string }[]
  }
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    performed_at: row.performed_at,
    day_name: row.days?.name ?? null,
    plan_name: row.days?.plans?.name ?? null,
    total_sets: row.set_logs?.length ?? 0,
  }))
}

export type SessionDetail = {
  id: string
  performed_at: string
  day_name: string | null
  plan_name: string | null
  exercises: {
    exercise_id: string | null
    exercise_name: string
    sets: {
      id: string
      set_number: number
      weight: number | null
      reps: number | null
      notes: string | null
    }[]
  }[]
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const supabase = await createClient()
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('id, performed_at, day_id, days(name, plans(name))')
    .eq('id', sessionId)
    .single()
  if (sErr || !session) return null

  const { data: logs, error: lErr } = await supabase
    .from('set_logs')
    .select('id, exercise_id, exercise_name, set_number, weight, reps, notes')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true })
  if (lErr) throw lErr

  // Group by exercise
  type Log = {
    id: string
    exercise_id: string | null
    exercise_name: string
    set_number: number
    weight: number | null
    reps: number | null
    notes: string | null
  }
  const grouped = new Map<string, { exercise_id: string | null; exercise_name: string; sets: Log[] }>()
  for (const log of (logs ?? []) as Log[]) {
    const key = log.exercise_id ?? log.exercise_name
    if (!grouped.has(key)) {
      grouped.set(key, {
        exercise_id: log.exercise_id,
        exercise_name: log.exercise_name,
        sets: [],
      })
    }
    grouped.get(key)!.sets.push(log)
  }

  type SessionRow = {
    id: string
    performed_at: string
    day_id: string | null
    days: { name: string; plans: { name: string } | null } | null
  }
  const s = session as unknown as SessionRow

  return {
    id: s.id,
    performed_at: s.performed_at,
    day_name: s.days?.name ?? null,
    plan_name: s.days?.plans?.name ?? null,
    exercises: [...grouped.values()].map((ex) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      sets: ex.sets.map((s) => ({
        id: s.id,
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        notes: s.notes,
      })),
    })),
  }
}

// ---------------------- Analytics queries ----------------------

export type OverviewStats = {
  total_workouts: number
  total_sets: number
  current_streak_weeks: number
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = await createClient()

  // Count workouts
  const { count: workoutCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })

  // Count sets
  const { count: setCount } = await supabase
    .from('set_logs')
    .select('id', { count: 'exact', head: true })

  // Get session dates for streak calculation
  const { data: sessions } = await supabase
    .from('sessions')
    .select('performed_at')
    .order('performed_at', { ascending: false })

  // Calculate current streak (consecutive weeks with at least one workout)
  let streak = 0
  if (sessions && sessions.length > 0) {
    const weeks = new Set<string>()
    for (const s of sessions) {
      const d = new Date(s.performed_at)
      // ISO week key: year-week
      const year = d.getFullYear()
      const startOfYear = new Date(year, 0, 1)
      const dayOfYear = Math.floor(
        (d.getTime() - startOfYear.getTime()) / 86400000
      )
      const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
      weeks.add(`${year}-${week}`)
    }
    // Walk backwards from this week
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    const dayOfYear = Math.floor(
      (today.getTime() - startOfYear.getTime()) / 86400000
    )
    let curYear = today.getFullYear()
    let curWeek = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
    while (weeks.has(`${curYear}-${curWeek}`)) {
      streak++
      curWeek--
      if (curWeek < 1) {
        curYear--
        curWeek = 52
      }
    }
  }

  return {
    total_workouts: workoutCount ?? 0,
    total_sets: setCount ?? 0,
    current_streak_weeks: streak,
  }
}

export type WeeklyFrequencyPoint = {
  week_label: string
  workout_count: number
}

export async function getWeeklyFrequency(weeks = 8): Promise<WeeklyFrequencyPoint[]> {
  const supabase = await createClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('sessions')
    .select('performed_at')
    .gte('performed_at', cutoff.toISOString())
    .order('performed_at', { ascending: true })
  if (error) throw error

  // Bucket into weeks
  const buckets: WeeklyFrequencyPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - i * 7)
    const label =
      i === 0
        ? 'This wk'
        : `${weekStart.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}`
    buckets.push({ week_label: label, workout_count: 0 })
  }

  for (const s of data ?? []) {
    const d = new Date(s.performed_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    const weeksAgo = Math.floor(diffDays / 7)
    const idx = weeks - 1 - weeksAgo
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].workout_count++
    }
  }

  return buckets
}

export type ExerciseOption = {
  exercise_id: string
  name: string
  session_count: number
}

export async function getLoggedExercises(): Promise<ExerciseOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('set_logs')
    .select('exercise_id, exercise_name')
    .not('exercise_id', 'is', null)
  if (error) throw error

  const map = new Map<string, { name: string; count: number }>()
  type Row = { exercise_id: string; exercise_name: string }
  for (const row of ((data ?? []) as Row[])) {
    if (!row.exercise_id) continue
    const existing = map.get(row.exercise_id)
    if (existing) {
      existing.count++
    } else {
      map.set(row.exercise_id, { name: row.exercise_name, count: 1 })
    }
  }
  return [...map.entries()]
    .map(([id, v]) => ({ exercise_id: id, name: v.name, session_count: v.count }))
    .sort((a, b) => b.session_count - a.session_count)
}
// 1RM formula (Epley)
function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

export type ProgressPoint = {
  date: string
  performed_at_label: string
  top_weight: number | null
  est_1rm: number | null
  volume: number
}

export async function getExerciseProgress(exerciseId: string): Promise<ProgressPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('set_logs')
    .select('weight, reps, sessions!inner(id, performed_at)')
    .eq('exercise_id', exerciseId)
  if (error) throw error

  type Row = { weight: number | null; reps: number | null; sessions: { id: string; performed_at: string } | null }
  const rows = (data ?? []) as unknown as Row[]

  const bySession = new Map<string, { performed_at: string; sets: { weight: number; reps: number }[] }>()
  for (const row of rows) {
    if (!row.sessions) continue
    if (row.weight === null || row.reps === null) continue
    const sid = row.sessions.id
    if (!bySession.has(sid)) {
      bySession.set(sid, { performed_at: row.sessions.performed_at, sets: [] })
    }
    bySession.get(sid)!.sets.push({ weight: row.weight, reps: row.reps })
  }

  const points: ProgressPoint[] = [...bySession.values()].map((s) => {
    const topWeight = Math.max(...s.sets.map((x) => x.weight))
    const est = Math.max(...s.sets.map((x) => estimate1RM(x.weight, x.reps)))
    const volume = s.sets.reduce((sum, x) => sum + x.weight * x.reps, 0)
    const d = new Date(s.performed_at)
    return {
      date: s.performed_at,
      performed_at_label: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      top_weight: topWeight,
      est_1rm: Math.round(est * 10) / 10,
      volume,
    }
  }).sort((a, b) => a.date.localeCompare(b.date))

  return points
}

export type PRItem = {
  exercise_id: string
  exercise_name: string
  best_weight: number
  best_reps: number
  performed_at: string
}

export async function getPRs(): Promise<PRItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('set_logs')
    .select('exercise_id, exercise_name, weight, reps, sessions!inner(performed_at)')
    .not('exercise_id', 'is', null)
    .not('weight', 'is', null)
  if (error) throw error

  type Row = { exercise_id: string; exercise_name: string; weight: number; reps: number | null; sessions: { performed_at: string } | null }
  const rows = (data ?? []) as unknown as Row[]

  const bestPerExercise = new Map<string, PRItem>()
  for (const row of rows) {
    if (!row.exercise_id || !row.sessions) continue
    const existing = bestPerExercise.get(row.exercise_id)
    if (!existing || row.weight > existing.best_weight) {
      bestPerExercise.set(row.exercise_id, {
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        best_weight: row.weight,
        best_reps: row.reps ?? 0,
        performed_at: row.sessions.performed_at,
      })
    }
  }

  return [...bestPerExercise.values()].sort((a, b) => b.best_weight - a.best_weight)
}