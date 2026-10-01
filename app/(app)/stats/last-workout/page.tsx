import Link from 'next/link'
import { getMostRecentSessionId, getSessionDetail, normalizeExerciseName } from '@/lib/db'
import { getSessionTotals } from '@/lib/board'
import { Weight, Volume } from '../../weight'
import ClearSessionStorage from './clear-storage'
import ShareButton from './share-button'

// Scattered across the top ~300px; they drop in once, only when there are PRs.
const CONFETTI_PIECES = [
  { left: '9%', top: 150, size: 10, accent: true, rot: 20, delay: 0 },
  { left: '33%', top: 104, size: 8, accent: false, rot: 45, delay: 80 },
  { left: '67%', top: 164, size: 12, accent: true, rot: -15, delay: 160 },
  { left: '86%', top: 118, size: 8, accent: false, rot: 0, delay: 40 },
  { left: '18%', top: 250, size: 8, accent: true, rot: 30, delay: 220 },
  { left: '79%', top: 262, size: 10, accent: false, rot: 12, delay: 120 },
]

export default async function LastWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ dayId?: string; minutes?: string }>
}) {
  const sp = await searchParams
  const sessionId = await getMostRecentSessionId()

  if (!sessionId) {
    return (
      <div className="space-y-4">
        <div className="k text-neutral-500">Session complete</div>
        <p className="text-[15px] leading-[1.5] font-medium text-neutral-500">No workouts logged yet.</p>
        <Link href="/log" className="btn-primary block px-[18px] py-[22px] text-left text-lg font-black uppercase">
          Go to Log →
        </Link>
      </div>
    )
  }

  const [session, totals] = await Promise.all([getSessionDetail(sessionId), getSessionTotals()])

  if (!session) {
    return (
      <div className="border-2 border-accent p-4 text-bg">
        Couldn&apos;t load your last workout.
      </div>
    )
  }

  const prDeltas = totals.get(session.id)?.prs ?? new Map<string, number>()
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
    0
  )
  const prCount = prDeltas.size
  const minutesRaw = sp.minutes ? parseInt(sp.minutes, 10) : NaN
  const minutes = Number.isFinite(minutesRaw) ? minutesRaw : null

  // Best set = heaviest, ties broken by reps.
  const rows = session.exercises.map((ex) => {
    const best = ex.sets.reduce<(typeof ex.sets)[number] | null>((b, s) => {
      if (!b) return s
      const bw = b.weight ?? 0
      const sw = s.weight ?? 0
      return sw > bw || (sw === bw && (s.reps ?? 0) > (b.reps ?? 0)) ? s : b
    }, null)
    const key = normalizeExerciseName(ex.exercise_name)
    return { ex, best, delta: prDeltas.get(key) ?? null }
  })
  const prRows = rows.filter((r) => r.delta !== null)
  const held = rows.filter((r) => r.delta === null)

  return (
    <div className="relative pt-[env(safe-area-inset-top)]">
      <ClearSessionStorage dayId={sp.dayId} />

      {prCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 -top-6 h-[300px] overflow-hidden" aria-hidden="true">
          {CONFETTI_PIECES.map((c, i) => (
            <i
              key={i}
              className={`confetti-piece block ${c.accent ? 'bg-accent' : 'bg-bg'}`}
              style={{
                left: c.left,
                top: c.top - 60,
                width: c.size,
                height: c.size,
                animationDelay: `${c.delay}ms`,
                ['--confetti-rot' as string]: `${c.rot}deg`,
              }}
            />
          ))}
        </div>
      )}

      <div className="pt-2.5 md:max-w-[640px] md:pt-10">
        <div className="k text-accent">Session complete</div>
        <h2 className="mt-3 text-[78px] leading-[0.84] font-black tracking-[-0.05em] break-words uppercase">
          {session.day_name ?? 'Workout'}
          <br />
          done.
        </h2>
        <div className="k num mt-4 text-neutral-500">
          {minutes !== null && <>{minutes} minute{minutes === 1 ? '' : 's'} · </>}
          {totalSets} set{totalSets === 1 ? '' : 's'} · <Volume lbs={totalVolume} /> moved
        </div>

        {prCount > 0 && (
          <div className="mt-6 bg-accent px-[18px] py-4 text-bg">
            <div className="k opacity-80">New personal records</div>
            <div className="mt-2 text-[40px] leading-none font-black tracking-[-0.04em] uppercase">
              {prCount} PR{prCount === 1 ? '' : 's'}
            </div>
          </div>
        )}

        <div className="mt-[18px] border-t-2 border-neutral-700">
          {prRows.map(({ ex, best, delta }) => (
            <div key={ex.exercise_id ?? ex.exercise_name} className="flex items-baseline justify-between gap-3 border-b border-neutral-800 py-[13px]">
              <span className="min-w-0 truncate text-base font-extrabold uppercase">{ex.exercise_name}</span>
              <span className="num shrink-0 text-lg font-black">
                <Weight lbs={best?.weight ?? null} suffix={false} /> × {best?.reps ?? '–'}{' '}
                <span className="text-accent">
                  ▲<Weight lbs={delta} suffix={false} />
                </span>
              </span>
            </div>
          ))}
          {held.length > 0 && (
            <div className="flex items-baseline justify-between gap-3 border-b-2 border-neutral-700 py-[13px] text-neutral-500">
              <span className="min-w-0 text-sm font-medium">{held.map((r) => r.ex.exercise_name).join(' · ')}</span>
              <span className="shrink-0 text-sm font-semibold">held</span>
            </div>
          )}
        </div>

        <Link href={`/history/${session.id}`} className="k mt-4 inline-block text-neutral-500 hover:text-bg">
          View or edit sets →
        </Link>
      </div>

      {/* Pinned to the bottom on mobile, inline on desktop. */}
      <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-[1fr_1.2fr] border-t-2 border-neutral-700 bg-ink md:static md:mt-8 md:max-w-[640px] md:border-2">
        <ShareButton
          title="Gym Journal"
          dayName={session.day_name ?? 'Workout'}
          totalSets={totalSets}
          totalVolumeLbs={totalVolume}
          prCount={prCount}
        />
        <Link href="/log" className="btn-primary col-start-2 px-4 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] text-left md:pb-5 text-[13px] font-extrabold tracking-[0.06em] uppercase">
          Done →
        </Link>
      </div>
    </div>
  )
}
