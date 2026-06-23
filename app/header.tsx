import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="border-b border-gray-800 bg-black">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-white">Gym Journal</h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:inline">{user?.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}