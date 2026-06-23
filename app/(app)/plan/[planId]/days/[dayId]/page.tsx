import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDayWithExercises } from '@/lib/db'
import { createExercise, deleteExercise } from '@/app/plan-actions'

export default async function DayEditorPage({
  params,
}: {
  params: Promise<{ planId: string; dayId: string }>
}) {
  const { planId, dayId } = await params
  const day = await getDayWithExercises(dayId)
  if (!day) notFound()

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/plan/${planId}`} className="text-sm text-gray-400 hover:text-white">
          ← Back to plan
        </Link>
      </div>

      <h2 className="text-2xl font-semibold">{day.name}</h2>

      {day.exercises.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-8 text-center text-sm text-gray-400">
          Add exercises below.
        </div>
      ) : (
        <div className="space-y-2">
          {day.exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3"
            >
              <div>
                <p className="font-medium">{ex.name}</p>
                <p className="text-xs text-gray-500">
                  {ex.target_sets} × {ex.target_reps}
                </p>
              </div>
              <form action={deleteExercise}>
                <input type="hidden" name="exerciseId" value={ex.id} />
                <button
                  type="submit"
                  className="text-xs text-gray-500 hover:text-red-400"
                >
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form
        action={createExercise}
        className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-2"
      >
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Add exercise</p>
        <input type="hidden" name="dayId" value={day.id} />
        <input
          type="text"
          name="name"
          placeholder="Exercise name (e.g. Bench press)"
          required
          className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
        />
        <div className="flex gap-2">
          <input
            type="number"
            name="target_sets"
            min="1"
            placeholder="Sets"
            defaultValue="3"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
          <input
            type="text"
            name="target_reps"
            placeholder="Reps (e.g. 8-10)"
            defaultValue="8-10"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white"
        >
          + Add to day
        </button>
      </form>
    </div>
  )
}