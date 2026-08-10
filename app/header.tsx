import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="border-b-2 border-neutral-800 bg-ink">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <h1 className="text-lg font-black uppercase tracking-tight text-bg">Gym Journal</h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500 sm:inline">
            {user?.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="border-2 border-neutral-700 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-bg hover:border-accent hover:text-accent"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}