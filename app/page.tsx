import { createClient } from '@/lib/supabase/server'
import { signIn, signOut } from './actions'

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
          <h1 className="text-3xl font-semibold">You're signed in</h1>
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
            className="w-full rounded-lg bg-white px-6 py-3 font-medium text-black"
          >
            Send magic link
          </button>
        </form>
      </div>
    </main>
  )
}