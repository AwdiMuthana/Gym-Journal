'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    redirect('/?error=' + encodeURIComponent(error.message))
  }
  redirect('/?codeSent=1&email=' + encodeURIComponent(email))
}

export async function verifyEmailCode(formData: FormData) {
  const email = formData.get('email') as string
  const token = ((formData.get('token') as string) ?? '').trim()

  if (!email || !token) {
    redirect('/?error=' + encodeURIComponent('Missing email or code'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

  if (error) {
    redirect('/?codeSent=1&email=' + encodeURIComponent(email) + '&error=' + encodeURIComponent(error.message))
  }

  redirect('/')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    redirect('/?error=' + encodeURIComponent(error.message))
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}