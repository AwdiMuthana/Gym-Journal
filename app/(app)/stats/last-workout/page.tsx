import Link from 'next/link'
import {
  getMostRecentSessionId,
  getSessionDetail,
  getPRs,
  normalizeExerciseName,
} from '@/lib/db'
import LocalDateTime from '../../local-date-time'
import ClearSessionStorage from './clear-storage'

export default async function LastWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ dayId?: string }>
}) {
  const sp = await searchParams
  const sessionId = await getMostRecentSessionId()

  if (!sessionId) {
    return (
      <div className="space-y-4">
        <Link href="/stats" className="text-sm text-gray-400 hover:text-white">
          ← Stats
        </Link>
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center">
          <p className="text-gray-400">No workouts logged yet.</p>
          <p className="mt-1 mb-4 text-xs text-gray-500">
            Log one from the Log tab and it&apos;ll show up here.
          </p>
          <Link
            href="/log"
            className="inline-block rounded-md bg-[#5B5BD6] px-4 py-2 text-sm font-medium text-white"
          >
            Go to Log
          </Link>
        </div>
      </div>
    )
  }

  const [session, prs] = await Promise.all([getSessionDetail(sessionId), getPRs()])

  if (!session) {
    return (
      <div className="space-y-4">
        <Link href="/stats" className="text-sm text-gray-400 hover:text-white">
          ← Stats
        </Link>
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center text-gray-400">
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

  const prByName = new Map(prs.map((pr) => [normalizeExerciseName(pr.exercise_name), pr]))

  return (
    <div className="space-y-4">
      <ClearSessionStorage dayId={sp.dayId} />

      <Link href="/stats" className="text-sm text-gray-400 hover:text-white">
        ← Stats
      </Link>

      <div>
        <h2 className="text-2xl font-semibold">{session.day_name ?? 'Workout'}</h2>
        <p className="mt-1 text-xs text-gray-500">
          <LocalDateTime iso={session.performed_at} variant="full" />
          {session.plan_name && <> · {session.plan_name}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-3 text-center">
          <p className="text-2xl font-semibold">{totalSets}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">Sets</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-3 text-center">
          <p className="text-2xl font-semibold">{Math.round(totalVolume).toLocaleString()}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">Volume</p>
        </div>
      </div>

      <div className="space-y-3">
        {session.exercises.map((ex) => {
          const key = normalizeExerciseName(ex.exercise_name)
          const pr = prByName.get(key)
          const topWeightThisSession = Math.max(...ex.sets.map((s) => s.weight ?? 0))
          const isPR = pr && pr.best_weight === topWeightThisSession && pr.performed_at === session.performed_at

          return (
            <div key={ex.exercise_id ?? ex.exercise_name} className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <div className="mb-2 flex items-center gap-2">
                <p className="font-medium">{ex.exercise_name}</p>
                {isPR && (
                  <span className="rounded-full bg-[#5B5BD6]/20 px-2 py-0.5 text-[10px] font-medium text-[#5B5BD6]">
                    🔥 PR
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {ex.sets.map((s) => (
                  <div key={s.id} className="text-sm text-gray-300">
                    <span className="mr-3 text-gray-500">Set {s.set_number}</span>
                    {s.weight ?? '–'} × {s.reps ?? '–'}
                    {s.notes && <span className="ml-2 text-xs text-gray-500">— {s.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Link
        href={`/history/${session.id}`}
        className="block w-full rounded-md border border-gray-700 px-4 py-2.5 text-center text-sm text-gray-300 hover:bg-gray-900"
      >
        View or edit in History
      </Link>
    </div>
  )
}