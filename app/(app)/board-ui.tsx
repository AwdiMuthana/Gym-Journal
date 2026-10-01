import Link from 'next/link'
import type { PRItem } from '@/lib/db'
import type { WeeklyBoard } from '@/lib/board'
import { Weight } from './weight'

// Full-bleed screen title with the 2px section rule under it.
export function ScreenTitle({
  title,
  meta,
  action,
}: {
  title: string
  meta?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="-mx-[18px] -mt-6 flex items-end justify-between gap-3 border-b-2 border-neutral-700 px-[18px] pt-5 pb-4 md:-mx-7 md:px-7">
      <div className="min-w-0">
        <h2 className="text-[34px] leading-[0.95] font-black tracking-[-0.035em] uppercase">{title}</h2>
        {meta && <div className="k mt-[7px] text-neutral-500">{meta}</div>}
      </div>
      {action}
    </div>
  )
}

// Heights are sessions per week / max. Older weeks are muted, the last four
// are light, and the current week is accent.
export function WeekBars({ board, height }: { board: WeeklyBoard; height: number }) {
  const recentFrom = board.weeks.length - 4
  return (
    <div className="flex items-end gap-1" style={{ height }} role="img" aria-label={`Sessions per week, last ${board.weeks.length} weeks: ${board.weeks.map((w) => w.count).join(', ')}`}>
      {board.weeks.map((w, i) => (
        <i
          key={w.start}
          title={`${w.count} session${w.count === 1 ? '' : 's'}`}
          className={`block flex-1 ${w.current ? 'bg-accent' : i >= recentFrom ? 'bg-bg' : 'bg-neutral-700'}`}
          style={{ height: `${Math.max(w.count > 0 ? 6 : 2, (w.count / board.max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export function StreakBlock({ board }: { board: WeeklyBoard }) {
  const isBest = board.streak > 0 && board.streak >= board.bestStreak
  return (
    <div>
      <div className="k text-neutral-500">Streak</div>
      <div className="num mt-1.5 text-[96px] leading-[0.82] font-black tracking-[-0.055em] text-accent">{board.streak}</div>
      <div className="k mt-2 text-neutral-500">
        {board.streak === 1 ? 'Week' : 'Weeks'} without a miss
        {isBest ? ' · best ever' : board.bestStreak > 0 ? ` · best ${board.bestStreak}` : ''}
      </div>
    </div>
  )
}

// Shows the top `collapseAfter` records; the rest sit behind "Show all".
export function RecordsList({ records, limit, collapseAfter }: { records: PRItem[]; limit?: number; collapseAfter?: number }) {
  if (records.length === 0) return null
  const latest = records.reduce((a, b) => (b.performed_at > a.performed_at ? b : a))
  const shown = limit ? records.slice(0, limit) : records
  const visible = collapseAfter ? shown.slice(0, collapseAfter) : shown
  const hidden = collapseAfter ? shown.slice(collapseAfter) : []

  const row = (r: PRItem) => (
    <div key={r.key} className="flex items-baseline justify-between gap-3 border-b border-neutral-800 py-3">
      <span className="min-w-0 truncate text-base font-extrabold uppercase">{r.exercise_name}</span>
      <span className={`num shrink-0 text-xl font-black ${r.key === latest.key ? 'text-accent' : ''}`}>
        <Weight lbs={r.best_weight} suffix={false} /> × {r.best_reps}
      </span>
    </div>
  )

  return (
    <div>
      <div className="k text-neutral-500">Records</div>
      {visible.map(row)}
      {hidden.length > 0 && (
        <details className="group">
          <summary className="btn-outline mt-3 flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-xs font-extrabold tracking-[0.06em] text-bg uppercase [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show all {shown.length} records</span>
            <span className="hidden group-open:inline">Show less</span>
            <span aria-hidden="true" className="group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-1">{hidden.map(row)}</div>
        </details>
      )}
    </div>
  )
}

// First run: shown on Log when there's nothing to train yet.
export function EmptyBoard({ href }: { href: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-220px)] flex-col md:min-h-[520px]">
      <div className="flex flex-1 flex-col justify-center">
        <div className="k text-accent">Day zero</div>
        <h2 className="mt-3.5 text-[62px] leading-[0.86] font-black tracking-[-0.05em] uppercase">
          Empty
          <br />
          board.
        </h2>
        <p className="mt-[18px] max-w-[290px] text-[15px] leading-[1.5] font-medium text-neutral-500">
          Build a split first — days, exercises, target sets. After that, a session is three taps.
        </p>
        <div className="mt-[26px] grid max-w-[520px] grid-cols-3 gap-0.5">
          {['Make a plan', 'Log a set', 'Watch it climb'].map((step, i) => (
            <div key={step} className="border-2 border-neutral-700 p-[11px]">
              <div className="num text-base font-black">{String(i + 1).padStart(2, '0')}</div>
              <div className="k mt-[5px] text-neutral-500">{step}</div>
            </div>
          ))}
        </div>
      </div>
      <Link
        href={href}
        className="btn-primary mt-6 block w-full px-[18px] py-[22px] text-left text-[17px] font-black tracking-[0.02em] uppercase md:max-w-[520px]"
      >
        Build your first plan →
      </Link>
    </div>
  )
}
