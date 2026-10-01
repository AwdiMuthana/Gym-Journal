import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'
import LogoMark from './logo-mark'
import { DesktopNav } from './tabs'

function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="flex h-[28px] w-[28px] shrink-0 items-center justify-center text-neutral-500 hover:text-bg"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  )
}

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    // Pinned with a solid fill (and padded under the status bar) so the logo and
    // settings stay sharp and reachable while content scrolls beneath it.
    <header className="sticky top-0 z-30 border-b-2 border-neutral-700 bg-ink pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-[18px] pt-4 pb-3.5 md:px-7 md:py-4">
        <Link href="/log" className="flex items-center gap-[9px] md:gap-3">
          <span className="md:hidden"><LogoMark size="sm" /></span>
          <span className="hidden md:inline"><LogoMark size="md" /></span>
          <span className="k md:text-[20px] md:font-black md:tracking-[-0.02em]">Gym Journal</span>
        </Link>

        <DesktopNav />

        <div className="flex min-w-0 items-center gap-3">
          {/* Screens portal their own meta in here (e.g. Log's "Week 06 · Day 3 of 4"). */}
          <span id="header-meta" className="k truncate text-neutral-500 md:hidden" />
          <span className="k hidden items-center gap-1 text-neutral-500 md:flex">
            <span className="max-w-[220px] truncate">{user?.email}</span>
            <span>·</span>
            <form action={signOut}>
              <button type="submit" className="k text-neutral-500 hover:text-bg">
                Sign out
              </button>
            </form>
          </span>
          <SettingsLink />
        </div>
      </div>
    </header>
  )
}
