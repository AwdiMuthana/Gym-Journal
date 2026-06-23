import { createClient } from '@/lib/supabase/server'
import { signIn, signInWithGoogle, signOut } from './actions'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-3xl font-semibold">You&apos;re signed in</h1>
          <p className="text-gray-400">{user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg bg-white px-6 py-2 text-black font-medium"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Gym Journal</h1>
          <p className="text-gray-400">Sign in to log your workouts</p>
        </div>

        {params.sent && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center text-sm text-green-400">
            Check your email for the sign-in link.
          </div>
        )}
        {params.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full rounded-lg bg-white px-6 py-3 font-medium text-black flex items-center justify-center gap-3"
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
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-black px-2 text-gray-500">or with email</span>
          </div>
        </div>

        <form action={signIn} className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            className="w-full rounded-lg border border-gray-700 bg-transparent px-4 py-3 text-base text-white placeholder:text-gray-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-700 bg-transparent px-6 py-3 font-medium text-white"
          >
            Send magic link
          </button>
        </form>
      </div>
    </main>
  )
}