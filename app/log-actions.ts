'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  return { supabase, user }
}

type LoggedSet = {
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight: number | null
  reps: number | null
  notes: string | null
}

export async function finishSession(formData: FormData) {
  const dayId = formData.get('dayId') as string
  const setsRaw = formData.get('sets') as string
  if (!dayId || !setsRaw) {
    redirect('/log')
  }

  let sets: LoggedSet[] = []
  try {
    sets = JSON.parse(setsRaw)
  } catch {
    redirect('/log')
  }

  // Filter out empty sets (no weight AND no reps)
  sets = sets.filter((s) => s.weight !== null || s.reps !== null)

  if (sets.length === 0) {
    redirect('/log')
  }

  const { supabase, user } = await requireUser()

  // Create the session
  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, day_id: dayId, performed_at: new Date().toISOString() })
    .select()
    .single()
  if (sessionErr) throw sessionErr

  // Insert set_logs
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
  redirect(`/log/done?dayId=${dayId}&sessionId=${session.id}`)
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
  // set_logs cascade-delete via FK
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) throw error
  revalidatePath('/history')
  redirect('/history')
}