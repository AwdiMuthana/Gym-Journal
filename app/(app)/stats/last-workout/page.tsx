import Link from 'next/link'
import {
  getMostRecentSessionId,
  getSessionDetail,
  getSessionPRs,
  normalizeExerciseName,
} from '@/lib/db'
import LocalDateTime from '../../local-date-time'
import ClearSessionStorage from './clear-storage'
import ShareButton from './share-button'

const CONFETTI_PIECES = [
  { left: '8%', size: 10, color: 'var(--color-accent)', delay: '0s' },
  { left: '22%', size: 8, color: 'var(--color-bg)', delay: '0.15s' },
  { left: '48%', size: 12, color: 'var(--color-accent)', delay: '0.3s' },
  { left: '64%', size: 8, color: 'var(--color-bg)', delay: '0.1s' },
  { left: '78%', size: 10, color: 'var(--color-accent)', delay: '0.4s' },
  { left: '90%', size: 9, color: 'var(--color-bg)', delay: '0.25s' },
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
        <Link href="/stats" className="text-sm font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent">
          ← Stats
        </Link>
        <div className="border-2 border-neutral-700 py-12 text-center">
          <p className="text-neutral-400">No workouts logged yet.</p>
          <p className="mt-1 mb-4 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
            Log one from the Log tab and it&apos;ll show up here.
          </p>
          <Link
            href="/log"
            className="inline-block bg-accent px-4 py-2 text-sm font-black uppercase tracking-wide text-bg"
          >
            Go to Log
          </Link>
        </div>
      </div>
    )
  }

  const [session, prDeltas] = await Promise.all([
    getSessionDetail(sessionId),
    getSessionPRs(sessionId),
  ])

  if (!session) {
    return (
      <div className="space-y-4">
        <Link href="/stats" className="text-sm font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent">
          ← Stats
        </Link>
        <div className="border-2 border-neutral-700 py-12 text-center text-neutral-400">
          Couldn&apos;t load your last workout.
        </div>
      </div>
    )
  }

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const totalVolume = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
    0
  )
  const prCount = prDeltas.size
  const minutesRaw = sp.minutes ? parseInt(sp.minutes, 10) : NaN
  const minutes = Number.isFinite(minutesRaw) ? minutesRaw : null

  const shareText = `${session.day_name ?? 'Workout'} done — ${totalSets} set${totalSets === 1 ? '' : 's'}, ${Math.round(
    totalVolume
  ).toLocaleString()} lb moved${prCount > 0 ? `, ${prCount} PR${prCount === 1 ? '' : 's'}` : ''}.`

  const stats: { label: string; value: string }[] = []
  if (minutes !== null) stats.push({ label: 'Minutes', value: String(minutes) })
  stats.push({ label: 'Sets', value: String(totalSets) })
  stats.push({ label: 'Volume', value: Math.round(totalVolume).toLocaleString() })

  return (
    <div className="space-y-4">
      <ClearSessionStorage dayId={sp.dayId} />

      <div className="relative overflow-hidden border-2 border-neutral-700 p-5">
        {prCount > 0 && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CONFETTI_PIECES.map((c, i) => (
              <i
                key={i}
                className="confetti-piece"
                style={{
                  left: c.left,
                  width: c.size,
                  height: c.size,
                  background: c.color,
                  animationDelay: c.delay,
                }}
              />
            ))}
          </div>
        )}
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent">Session complete</p>
        <h2 className="mt-2 text-5xl font-black uppercase leading-[0.85] tracking-tight">
          {session.day_name ?? 'Workout'}
          <br />
          done.
        </h2>
        <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
          <LocalDateTime iso={session.performed_at} variant="full" />
          {session.plan_name && <> · {session.plan_name}</>}
        </p>
      </div>

      <div className={`grid gap-2 ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {stats.map((s) => (
          <div key={s.label} className="border-2 border-neutral-700 px-3 py-3 text-center">
            <p className="text-3xl font-black tabular-nums">{s.value}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {prCount > 0 && (
        <div className="bg-accent px-4 py-3 text-bg">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-80">New personal records</p>
          <p className="mt-1 text-3xl font-black uppercase tracking-tight">
            {prCount} PR{prCount === 1 ? '' : 's'}
          </p>
        </div>
      )}

      <div className="divide-y-2 divide-neutral-800 border-2 border-neutral-700">
        {session.exercises.map((ex) => {
          const key = normalizeExerciseName(ex.exercise_name)
          const isPR = prDeltas.has(key)
          const delta = prDeltas.get(key)

          return (
            <div key={ex.exercise_id ?? ex.exercise_name} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold uppercase tracking-tight">{ex.exercise_name}</p>
                {isPR && (
                  <span className="shrink-0 bg-accent px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-bg">
                    {delta ? `▲${delta} PR` : 'PR'}
                  </span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {ex.sets.map((s) => (
                  <div key={s.id} className="text-sm text-neutral-300">
                    <span className="mr-3 text-[10px] font-extrabold uppercase tracking-wide text-neutral-500">
                      Set {s.set_number}
                    </span>
                    <span className="font-bold tabular-nums">
                      {s.weight ?? '–'} × {s.reps ?? '–'}
                    </span>
                    {s.notes && <span className="ml-2 text-xs text-neutral-500">— {s.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ShareButton title="Gym Journal" text={shareText} />
        <Link
          href="/log"
          className="flex items-center justify-center bg-accent px-3 py-4 text-center text-sm font-black uppercase tracking-wide text-bg"
        >
          Done →
        </Link>
      </div>
      <Link
        href={`/history/${session.id}`}
        className="block w-full border-2 border-neutral-700 px-4 py-2.5 text-center text-sm font-extrabold uppercase tracking-wide text-bg hover:border-accent hover:text-accent"
      >
        View or edit in History
      </Link>
    </div>
  )
}
