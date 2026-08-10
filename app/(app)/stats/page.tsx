import {
  getOverviewStats,
  getWeeklyFrequency,
  getLoggedExercises,
  getExerciseProgress,
  getPRs,
} from '@/lib/db'
import Link from 'next/link'
import FrequencyChart from './frequency-chart'
import ProgressChart from './progress-chart'
import ExercisePicker from './exercise-picker'
import LocalDateTime from '../local-date-time'

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ ex?: string }>
}) {
  const sp = await searchParams
  const selectedExercise = sp.ex

  const [overview, frequency, exercises, prs] = await Promise.all([
    getOverviewStats(),
    getWeeklyFrequency(8),
    getLoggedExercises(),
    getPRs(),
  ])

  if (overview.total_workouts === 0) {
    return (
      <div className="border-2 border-neutral-700 py-12 text-center">
        <p className="text-neutral-400">No data yet.</p>
        <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
          Log a few workouts and stats will appear here.
        </p>
      </div>
    )
  }

  const effectiveExerciseKey = selectedExercise ?? exercises[0]?.key ?? undefined
  const progress = effectiveExerciseKey
    ? await getExerciseProgress(effectiveExerciseKey)
    : []
  const selectedExerciseName = exercises.find(
    (e) => e.key === effectiveExerciseKey
  )?.name

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tight">Your stats</h2>
        <Link href="/stats/last-workout" className="text-[11px] font-extrabold uppercase tracking-wide text-accent hover:underline">
          Last workout →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="border-2 border-neutral-700 px-3 py-3 text-center">
          <p className="text-3xl font-black tabular-nums">{overview.total_workouts}</p>
          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
            Workouts
          </p>
        </div>
        <div className="border-2 border-neutral-700 px-3 py-3 text-center">
          <p className="text-3xl font-black tabular-nums">{overview.total_sets}</p>
          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
            Total sets
          </p>
        </div>
        <div className="border-2 border-neutral-700 px-3 py-3 text-center">
          <p className="text-3xl font-black tabular-nums text-accent">
            {overview.current_streak_weeks}
          </p>
          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
            Week streak
          </p>
        </div>
      </div>

      {exercises.length > 0 && (
        <div className="border-2 border-neutral-700 p-4">
          <div className="mb-3">
            <p className="text-sm font-black uppercase tracking-tight">Exercise progress</p>
            <p className="text-[11px] text-neutral-500">
              {selectedExerciseName ?? 'Pick an exercise'} · top weight, est. 1RM, volume
            </p>
          </div>
          <div className="mb-3">
            <ExercisePicker options={exercises} selected={effectiveExerciseKey} />
          </div>
          <ProgressChart data={progress} />
        </div>
      )}

      {prs.length > 0 && (
        <div className="border-2 border-neutral-700 p-4">
          <div className="mb-3">
            <p className="text-sm font-black uppercase tracking-tight">Personal records</p>
            <p className="text-[11px] text-neutral-500">
              Heaviest weight per exercise
            </p>
          </div>
          <div className="space-y-2">
            {prs.map((pr) => (
              <div
                key={pr.key}
                className="flex items-center justify-between border-2 border-neutral-800 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold uppercase tracking-tight">
                    {pr.exercise_name}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    <LocalDateTime iso={pr.performed_at} variant="short" />
                  </p>
                </div>
                <p className="ml-3 text-sm font-black tabular-nums text-accent">
                  {pr.best_weight} × {pr.best_reps}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-2 border-neutral-700 p-4">
        <div className="mb-3">
          <p className="text-sm font-black uppercase tracking-tight">Weekly frequency</p>
          <p className="text-[11px] text-neutral-500">Workouts per week, last 8 weeks</p>
        </div>
        <FrequencyChart data={frequency} />
      </div>
    </div>
  )
}