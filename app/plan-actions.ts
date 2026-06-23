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

// Plans
export async function createPlan(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  if (!name) return
  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('plans')
    .insert({ name, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  revalidatePath('/plan')
  redirect(`/plan/${data.id}`)
}

export async function deletePlan(formData: FormData) {
  const planId = formData.get('planId') as string
  const { supabase } = await requireUser()
  const { error } = await supabase.from('plans').delete().eq('id', planId)
  if (error) throw error
  revalidatePath('/plan')
  redirect('/plan')
}

// Days
export async function createDay(formData: FormData) {
  const planId = formData.get('planId') as string
  const name = (formData.get('name') as string)?.trim()
  if (!planId || !name) return
  const { supabase } = await requireUser()

  // Get current max position to append at end
  const { data: existing } = await supabase
    .from('days')
    .select('position')
    .eq('plan_id', planId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data, error } = await supabase
    .from('days')
    .insert({ plan_id: planId, name, position: nextPosition })
    .select()
    .single()
  if (error) throw error
  revalidatePath(`/plan/${planId}`)
  redirect(`/plan/${planId}/days/${data.id}`)
}

export async function deleteDay(formData: FormData) {
  const dayId = formData.get('dayId') as string
  const planId = formData.get('planId') as string
  const { supabase } = await requireUser()
  const { error } = await supabase.from('days').delete().eq('id', dayId)
  if (error) throw error
  revalidatePath(`/plan/${planId}`)
  redirect(`/plan/${planId}`)
}

// Exercises
export async function createExercise(formData: FormData) {
  const dayId = formData.get('dayId') as string
  const name = (formData.get('name') as string)?.trim()
  const targetSets = parseInt(formData.get('target_sets') as string) || 3
  const targetReps = ((formData.get('target_reps') as string) || '8-10').trim()
  if (!dayId || !name) return
  const { supabase } = await requireUser()

  const { data: existing } = await supabase
    .from('exercises')
    .select('position')
    .eq('day_id', dayId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { error } = await supabase
    .from('exercises')
    .insert({
      day_id: dayId,
      name,
      target_sets: targetSets,
      target_reps: targetReps,
      position: nextPosition,
    })
  if (error) throw error
  revalidatePath(`/plan`)
}

export async function deleteExercise(formData: FormData) {
  const exerciseId = formData.get('exerciseId') as string
  const { supabase } = await requireUser()
  const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)
  if (error) throw error
  revalidatePath(`/plan`)
}