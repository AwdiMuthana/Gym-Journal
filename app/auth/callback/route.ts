import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    // Show actual error message instead of generic "auth"
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/?error=no_code_in_url`)
}