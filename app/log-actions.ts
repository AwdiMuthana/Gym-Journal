'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getLastSetsForExerciseName } from '@/lib/db'
import { generateText } from '@/lib/gemini'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  return { supabase, user }
}

type LoggedSet = {
  exerciseId: string | null
  exerciseName: string
  setNumber: number
  weight: number | null
  reps: number | null
  notes: string | null
}

export async function lookupLastByName(name: string) {
  return await getLastSetsForExerciseName(name)
}

export type WeightSuggestion =
  | { ok: true; weight: number; reps: number; note: string }
  | { ok: false; reason: 'missing_key' | 'rate_limited' | 'error'; message: string }

// Suggests a target weight/reps for today based on the last logged session for
// this exercise, following progressive-overload rules (small increase if reps
// were all hit, hold or smaller jump if reps were missed).
export async function suggestNextWeight(input: {
  exerciseName: string
  targetReps: string | null
  last: { performed_at: string; sets: { weight: number | null; reps: number | null; notes: string | null }[] } | null
}): Promise<WeightSuggestion> {
  const { exerciseName, targetReps, last } = input
  const validSets = (last?.sets ?? []).filter(
    (s): s is { weight: number; reps: number; notes: string | null } => s.weight !== null && s.reps !== null
  )
  if (validSets.length === 0) {
    return { ok: false, reason: 'error', message: 'No completed sets last time to base a suggestion on.' }
  }

  const setsSummary = validSets.map((s, i) => `Set ${i + 1}: ${s.weight} lb x ${s.reps} reps`).join('; ')

  const prompt = `You are a strength-training coach. A lifter is about to perform "${exerciseName}"${
    targetReps ? ` with a target of ${targetReps} reps per set` : ''
  }. Their most recent session for this exercise: ${setsSummary}.

Using progressive overload — if they hit all target reps last time, suggest a small weight increase; if they missed reps, suggest holding the same weight or a smaller jump — suggest a single target weight and rep count for today's first set.

Respond in EXACTLY this format and nothing else:
WEIGHT: <number>
REPS: <integer>
NOTE: <one short clause, under 12 words, no trailing punctuation>`

  const result = await generateText(prompt)
  if (!result.ok) return result

  const weightMatch = result.text.match(/WEIGHT:\s*([\d.]+)/i)
  const repsMatch = result.text.match(/REPS:\s*(\d+)/i)
  const noteMatch = result.text.match(/NOTE:\s*(.+)/i)
  const weight = weightMatch ? parseFloat(weightMatch[1]) : NaN
  const reps = repsMatch ? parseInt(repsMatch[1], 10) : NaN
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) {
    return { ok: false, reason: 'error', message: 'Couldn’t parse a suggestion — try again.' }
  }
  return { ok: true, weight, reps, note: noteMatch?.[1]?.trim() ?? '' }
}

export async function finishSession(formData: FormData) {
  const dayId = formData.get('dayId') as string
  const setsRaw = formData.get('sets') as string
  const startedAtRaw = formData.get('startedAt') as string | null
  if (!dayId || !setsRaw) {
    redirect('/log')
  }

  let sets: LoggedSet[] = []
  try {
    sets = JSON.parse(setsRaw)
  } catch {
    redirect('/log')
  }

  sets = sets.filter((s) => s.weight !== null || s.reps !== null)

  if (sets.length === 0) {
    redirect('/log')
  }

  const { supabase, user } = await requireUser()

  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, day_id: dayId, performed_at: new Date().toISOString() })
    .select()
    .single()
  if (sessionErr) throw sessionErr

  const setLogRows = sets.map((s) => ({
    session_id: session.id,
    exercise_id: s.exerciseId,
    exercise_name: s.exerciseName,
    set_number: s.setNumber,
    weight: s.weight,
    reps: s.reps,
    notes: s.notes,
  }))

  const { error: setsErr } = await supabase.from('set_logs').insert(setLogRows)
  if (setsErr) throw setsErr

  revalidatePath('/log')
  revalidatePath('/plan')

  const startedAt = startedAtRaw ? parseInt(startedAtRaw, 10) : NaN
  const minutes = Number.isFinite(startedAt)
    ? Math.max(0, Math.round((Date.now() - startedAt) / 60000))
    : null

  const summaryUrl = minutes !== null
    ? `/stats/last-workout?dayId=${dayId}&minutes=${minutes}`
    : `/stats/last-workout?dayId=${dayId}`
  redirect(summaryUrl)
}

export async function updateSetLog(formData: FormData) {
  const setLogId = formData.get('setLogId') as string
  const sessionId = formData.get('sessionId') as string
  const weightRaw = (formData.get('weight') as string)?.trim() ?? ''
  const repsRaw = (formData.get('reps') as string)?.trim() ?? ''
  const notes = ((formData.get('notes') as string) ?? '').trim()

  if (!setLogId || !sessionId) return

  const weight = weightRaw === '' ? null : parseFloat(weightRaw)
  const reps = repsRaw === '' ? null : parseInt(repsRaw)

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('set_logs')
    .update({ weight, reps, notes: notes || null })
    .eq('id', setLogId)
  if (error) throw error

  revalidatePath('/history')
  revalidatePath(`/history/${sessionId}`)
  redirect(`/history/${sessionId}`)
}

export async function deleteSetLog(formData: FormData) {
  const setLogId = formData.get('setLogId') as string
  const sessionId = formData.get('sessionId') as string
  if (!setLogId || !sessionId) return
  const { supabase } = await requireUser()
  const { error } = await supabase.from('set_logs').delete().eq('id', setLogId)
  if (error) throw error
  revalidatePath('/history')
  revalidatePath(`/history/${sessionId}`)
  redirect(`/history/${sessionId}`)
}

export async function deleteSession(formData: FormData) {
  const sessionId = formData.get('sessionId') as string
  if (!sessionId) return
  const { supabase } = await requireUser()
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) throw error
  revalidatePath('/history')
  redirect('/history')
}