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