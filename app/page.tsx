import { createClient } from '@/lib/supabase/server'
import { signIn, signInWithGoogle, verifyEmailCode } from './actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; codeSent?: string; email?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/log')
  }

  const showCodeStep = params.codeSent === '1' && !!params.email

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-ink text-bg">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-black uppercase tracking-tight">Gym Journal</h1>
          <p className="text-neutral-400">Sign in to log your workouts</p>
        </div>

        {params.error && (
          <div className="border-2 border-accent p-4 text-center text-sm text-accent-400">
            {decodeURIComponent(params.error)}
          </div>
        )}

        {showCodeStep ? (
          <>
            <div className="bg-bg p-4 text-center text-sm font-medium text-ink">
              We sent a code to {decodeURIComponent(params.email!)}.
            </div>

            <form action={verifyEmailCode} className="space-y-3">
              <input type="hidden" name="email" value={params.email} />
              <input
                type="text"
                name="token"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="Enter code"
                required
                autoFocus
                className="w-full border-2 border-neutral-700 bg-transparent px-4 py-3 text-center text-xl tracking-[0.3em] text-bg placeholder:text-neutral-600 placeholder:tracking-normal focus-visible:border-accent focus-visible:outline-none"
              />
              <button
                type="submit"
                className="w-full bg-bg px-6 py-3 font-black uppercase tracking-wide text-ink"
              >
                Verify code
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
              <Link href="/" className="hover:text-accent">
                Use a different email
              </Link>
              <form action={signIn}>
                <input type="hidden" name="email" value={params.email} />
                <button type="submit" className="hover:text-accent">
                  Resend code
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="w-full bg-bg px-6 py-3 font-black uppercase tracking-wide text-ink flex items-center justify-center gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-ink px-2 font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                  or with email
                </span>
              </div>
            </div>

            <form action={signIn} className="space-y-3">
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                className="w-full border-2 border-neutral-700 bg-transparent px-4 py-3 text-base text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
              />
              <button
                type="submit"
                className="w-full border-2 border-neutral-700 bg-transparent px-6 py-3 font-black uppercase tracking-wide text-bg hover:border-accent hover:text-accent"
              >
                Send sign-in code
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}