import {
  getOverviewStats,
  getWeeklyFrequency,
  getLoggedExercises,
  getExerciseProgress,
  getPRs,
} from '@/lib/db'
import FrequencyChart from './frequency-chart'
import ProgressChart from './progress-chart'
import ExercisePicker from './exercise-picker'

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

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
      <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center">
        <p className="text-gray-400">No data yet.</p>
        <p className="mt-1 text-xs text-gray-500">
          Log a few workouts and stats will appear here.
        </p>
      </div>
    )
  }

  // Default to the most-logged exercise if none selected and any exist
  const effectiveExerciseId =
    selectedExercise ?? exercises[0]?.exercise_id ?? undefined
  const progress = effectiveExerciseId
    ? await getExerciseProgress(effectiveExerciseId)
    : []
  const selectedExerciseName = exercises.find(
    (e) => e.exercise_id === effectiveExerciseId
  )?.name

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your stats</h2>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-3 text-center">
          <p className="text-2xl font-semibold">{overview.total_workouts}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
            Workouts
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-3 text-center">
          <p className="text-2xl font-semibold">{overview.total_sets}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
            Total sets
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-3 text-center">
          <p className="text-2xl font-semibold">
            {overview.current_streak_weeks}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
            Week streak
          </p>
        </div>
      </div>

      {/* Per-exercise progress */}
      {exercises.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium">Exercise progress</p>
            <p className="text-xs text-gray-500">
              {selectedExerciseName ?? 'Pick an exercise'} · top weight, est. 1RM, volume
            </p>
          </div>
          <div className="mb-3">
            <ExercisePicker
              options={exercises}
              selected={effectiveExerciseId}
            />
          </div>
          <ProgressChart data={progress} />
        </div>
      )}

      {/* PRs */}
      {prs.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium">Personal records</p>
            <p className="text-xs text-gray-500">
              Heaviest weight per exercise
            </p>
          </div>
          <div className="space-y-2">
            {prs.map((pr) => (
              <div
                key={pr.exercise_id}
                className="flex items-center justify-between rounded-md border border-gray-800 bg-black px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {pr.exercise_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fmtDate(pr.performed_at)}
                  </p>
                </div>
                <p className="ml-3 text-sm font-semibold tabular-nums">
                  {pr.best_weight} × {pr.best_reps}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly frequency */}
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        <div className="mb-3">
          <p className="text-sm font-medium">Weekly frequency</p>
          <p className="text-xs text-gray-500">Workouts per week, last 8 weeks</p>
        </div>
        <FrequencyChart data={frequency} />
      </div>
    </div>
  )
}