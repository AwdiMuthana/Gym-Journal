import Link from 'next/link'
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
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center border-2 border-neutral-700 text-bg hover:border-accent hover:text-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
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